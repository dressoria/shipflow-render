import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createServiceSupabaseClient,
  isServiceRoleConfigured,
  isServerSupabaseConfigured,
} from "@/lib/server/supabaseServer";

type AuditSeverity = "info" | "warning" | "error" | "critical";

type AuditLogInput = {
  actorUserId?: string | null;
  actorEmail?: string | null;
  userId?: string | null;
  eventType: string;
  severity?: AuditSeverity;
  entityType?: "shipment" | "balance_movement" | "admin" | "provider" | "auth" | string | null;
  entityId?: string | null;
  provider?: string | null;
  trackingNumber?: string | null;
  idempotencyKey?: string | null;
  requestId?: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

const SENSITIVE_KEY_PATTERN = /(secret|token|key|authorization|password|credential|api[-_]?key|service_role)/i;

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    if (depth > 2) return "[array]";
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    if (depth > 2) return "[object]";
    const sanitized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : sanitizeValue(nestedValue, depth + 1);
    }
    return sanitized;
  }
  return String(value);
}

export function sanitizeAuditMetadata(metadata?: Record<string, unknown> | null) {
  return (sanitizeValue(metadata ?? {}) ?? {}) as Record<string, unknown>;
}

export async function createAuditLog(input: AuditLogInput, supabaseClient?: SupabaseClient) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return;
  }

  try {
    const client = supabaseClient ?? createServiceSupabaseClient();
    const metadata = sanitizeAuditMetadata({
      severity: input.severity ?? "info",
      actorEmail: input.actorEmail ?? null,
      userId: input.userId ?? null,
      provider: input.provider ?? null,
      trackingNumber: input.trackingNumber ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      requestId: input.requestId ?? null,
      message: input.message,
      ...(input.metadata ?? {}),
    });

    const { error } = await client.from("audit_logs").insert({
      actor_user_id: input.actorUserId ?? null,
      action: input.eventType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    });

    if (error) {
      console.error("[AuditLogFailed]", {
        eventType: input.eventType,
        severity: input.severity ?? "info",
        message: error.message,
      });
    }
  } catch (error) {
    console.error("[AuditLogFailed]", {
      eventType: input.eventType,
      severity: input.severity ?? "info",
      message: error instanceof Error ? error.message : String(error ?? "unknown"),
    });
  }
}

export async function createReconciliationEvent(input: Omit<AuditLogInput, "severity">, supabaseClient?: SupabaseClient) {
  return createAuditLog({ ...input, severity: "critical" }, supabaseClient);
}
