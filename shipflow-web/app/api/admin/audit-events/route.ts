import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { sanitizeAuditMetadata } from "@/lib/server/auditLog";
import { parseAdminLimit } from "@/lib/server/adminSupport";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";

type AuditLogRow = {
  id: string;
  actor_user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

function mapAuditEvent(row: AuditLogRow) {
  const metadata = sanitizeAuditMetadata(row.metadata);
  return {
    id: row.id,
    actorUserId: row.actor_user_id ?? null,
    actorEmail: text(metadata.actorEmail),
    userId: text(metadata.userId),
    eventType: row.action,
    severity: text(metadata.severity) ?? "info",
    entityType: row.entity_type ?? null,
    entityId: row.entity_id ?? null,
    provider: text(metadata.provider),
    trackingNumber: text(metadata.trackingNumber),
    idempotencyKey: text(metadata.idempotencyKey),
    requestId: text(metadata.requestId),
    message: text(metadata.message) ?? row.action,
    createdAt: row.created_at,
  };
}

function isAuditTableMissing(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "42P01" ||
    candidate.code === "PGRST205" ||
    (candidate.message?.toLowerCase().includes("audit_logs") ?? false)
  );
}

export async function GET(request: Request) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin support is not configured correctly.", 503);
  }

  try {
    const { serviceSupabase } = await requireAdminUser(request);
    const url = new URL(request.url);
    const limit = parseAdminLimit(url.searchParams.get("limit"), 50);
    const severity = url.searchParams.get("severity")?.trim();
    const eventType = url.searchParams.get("eventType")?.trim();

    let query = serviceSupabase
      .from("audit_logs")
      .select("id,actor_user_id,action,entity_type,entity_id,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventType) query = query.eq("action", eventType);

    const { data, error } = await query.returns<AuditLogRow[]>();
    if (error) {
      if (isAuditTableMissing(error)) return apiSuccess({ events: [], limit });
      throw error;
    }

    const events = (data ?? [])
      .map(mapAuditEvent)
      .filter((event) => !severity || event.severity === severity);

    return apiSuccess({ events, limit });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load audit events.");
  }
}
