import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import {
  calculateAdminTotals,
  loadProfiles,
  mapAdminMovement,
  mapAdminShipment,
  type BalanceMovementRow,
} from "@/lib/server/adminSupport";
import type { ShipmentRow } from "@/lib/server/shipments/createInternalShipment";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";
import { sanitizeAuditMetadata } from "@/lib/server/auditLog";

type AuditLogRow = {
  id: string;
  actor_user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

function mapAuditEvent(row: AuditLogRow) {
  const metadata = sanitizeAuditMetadata(row.metadata);
  const severity = typeof metadata.severity === "string" ? metadata.severity : "info";
  const message = typeof metadata.message === "string" ? metadata.message : row.action;
  return {
    id: row.id,
    actorUserId: row.actor_user_id ?? null,
    actorEmail: typeof metadata.actorEmail === "string" ? metadata.actorEmail : null,
    userId: typeof metadata.userId === "string" ? metadata.userId : null,
    eventType: row.action,
    severity,
    entityType: row.entity_type ?? null,
    entityId: row.entity_id ?? null,
    provider: typeof metadata.provider === "string" ? metadata.provider : null,
    trackingNumber: typeof metadata.trackingNumber === "string" ? metadata.trackingNumber : null,
    idempotencyKey: typeof metadata.idempotencyKey === "string" ? metadata.idempotencyKey : null,
    requestId: typeof metadata.requestId === "string" ? metadata.requestId : null,
    message,
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
    const { byId: profilesById, users } = await loadProfiles(serviceSupabase);

    const { data: shipments, error: shipmentsError } = await serviceSupabase
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<ShipmentRow[]>();

    if (shipmentsError) throw shipmentsError;

    const { data: movements, error: movementsError } = await serviceSupabase
      .from("balance_movements")
      .select("id,user_id,concept,amount,type,reference_type,reference_id,shipment_id,idempotency_key,metadata,created_by,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<BalanceMovementRow[]>();

    if (movementsError) throw movementsError;

    const { data: auditRows, error: auditError } = await serviceSupabase
      .from("audit_logs")
      .select("id,actor_user_id,action,entity_type,entity_id,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<AuditLogRow[]>();

    if (auditError && !isAuditTableMissing(auditError)) throw auditError;

    const shipmentRows = shipments ?? [];
    const movementRows = movements ?? [];
    const auditEvents = auditError ? [] : (auditRows ?? []).map(mapAuditEvent);
    const pendingAuditEvents = auditEvents.filter((event) => ["warning", "error", "critical"].includes(event.severity));
    const shipmentsById = new Map(shipmentRows.map((shipment) => [shipment.id, shipment]));
    const totals = calculateAdminTotals(shipmentRows, movementRows);

    return apiSuccess({
      users,
      shipments: shipmentRows.map((shipment) => mapAdminShipment(shipment, profilesById)),
      movements: movementRows.map((movement) => mapAdminMovement(movement, profilesById, shipmentsById)),
      auditEvents,
      totals: {
        ...totals,
        totalUsers: users.length,
      },
      reconciliation: {
        pendingCount: pendingAuditEvents.length,
        notes: [
          pendingAuditEvents.length > 0
            ? "Review warning, error, and critical audit events."
            : auditError
              ? "Persistent audit logs are not configured yet."
              : "No warning or critical audit events found.",
          "Persistent resolve/close workflow is not implemented yet.",
        ],
      },
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load admin overview.");
  }
}
