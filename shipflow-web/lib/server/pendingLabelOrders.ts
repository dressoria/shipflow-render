import { createServiceSupabaseClient } from "@/lib/server/supabaseServer";
import type {
  PendingLabelOrder,
  PendingLabelOrderStatus,
  CreatePendingLabelOrderInput,
  PendingLabelOrderRateSnapshot,
  PendingLabelOrderParcel,
  StructuredAddress,
} from "@/lib/types";

function rowToOrder(row: Record<string, unknown>): PendingLabelOrder {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    status: row.status as PendingLabelOrderStatus,
    provider: row.provider as string,
    serviceCode: (row.service_code as string | undefined) ?? undefined,
    serviceName: (row.service_name as string | undefined) ?? undefined,
    amountCents: row.amount_cents as number,
    currency: (row.currency as string) ?? "usd",
    rateSnapshot: row.rate_snapshot as PendingLabelOrderRateSnapshot,
    origin: row.origin as StructuredAddress,
    destination: row.destination as StructuredAddress,
    parcel: row.parcel as PendingLabelOrderParcel,
    stripeCheckoutSessionId: (row.stripe_checkout_session_id as string | undefined) ?? undefined,
    stripePaymentIntentId: (row.stripe_payment_intent_id as string | undefined) ?? undefined,
    stripeEventId: (row.stripe_event_id as string | undefined) ?? undefined,
    stripeRefundId: (row.stripe_refund_id as string | undefined) ?? undefined,
    idempotencyKey: (row.idempotency_key as string | undefined) ?? undefined,
    shipmentId: (row.shipment_id as string | undefined) ?? undefined,
    labelId: (row.label_id as string | undefined) ?? undefined,
    trackingNumber: (row.tracking_number as string | undefined) ?? undefined,
    errorMessage: (row.error_message as string | undefined) ?? undefined,
    expiresAt: row.expires_at as string,
    paidAt: (row.paid_at as string | undefined) ?? undefined,
    refundedAt: (row.refunded_at as string | undefined) ?? undefined,
    refundAttemptedAt: (row.refund_attempted_at as string | undefined) ?? undefined,
    refundErrorMessage: (row.refund_error_message as string | undefined) ?? undefined,
    processedAt: (row.processed_at as string | undefined) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createPendingLabelOrder(
  input: CreatePendingLabelOrderInput,
): Promise<PendingLabelOrder> {
  if (input.amountCents <= 0) {
    throw new Error("amount_cents must be greater than 0.");
  }

  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase
    .from("pending_label_orders")
    .insert({
      user_id: input.userId,
      status: "pending_payment",
      provider: input.provider,
      service_code: input.serviceCode ?? null,
      service_name: input.serviceName ?? null,
      amount_cents: input.amountCents,
      currency: input.currency ?? "usd",
      rate_snapshot: input.rateSnapshot,
      origin: input.origin,
      destination: input.destination,
      parcel: input.parcel,
      idempotency_key: input.idempotencyKey ?? null,
      metadata: input.metadata ?? null,
    })
    .select("*")
    .single<Record<string, unknown>>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create pending label order.");
  }

  return rowToOrder(data);
}

export async function updatePendingLabelOrderCheckoutSession(
  orderId: string,
  stripeCheckoutSessionId: string,
): Promise<void> {
  const serviceSupabase = createServiceSupabaseClient();
  const { error } = await serviceSupabase
    .from("pending_label_orders")
    .update({ stripe_checkout_session_id: stripeCheckoutSessionId })
    .eq("id", orderId)
    .eq("status", "pending_payment");

  if (error) {
    throw new Error(error.message);
  }
}

export async function getPendingLabelOrderForUser(
  orderId: string,
  userId: string,
): Promise<PendingLabelOrder | null> {
  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase
    .from("pending_label_orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle<Record<string, unknown>>();

  if (error) throw new Error(error.message);
  return data ? rowToOrder(data) : null;
}

export async function getPendingLabelOrderByCheckoutSession(
  sessionId: string,
): Promise<PendingLabelOrder | null> {
  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase
    .from("pending_label_orders")
    .select("*")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle<Record<string, unknown>>();

  if (error) throw new Error(error.message);
  return data ? rowToOrder(data) : null;
}

export async function markPendingLabelOrderPaidTestMode(
  orderId: string,
  opts: { stripePaymentIntentId?: string | null; stripeEventId?: string | null },
): Promise<void> {
  const serviceSupabase = createServiceSupabaseClient();
  const { error } = await serviceSupabase
    .from("pending_label_orders")
    .update({
      status: "paid_test_mode",
      stripe_payment_intent_id: opts.stripePaymentIntentId ?? null,
      stripe_event_id: opts.stripeEventId ?? null,
      paid_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) throw new Error(error.message);
}

export async function markPendingLabelOrderPaidWaitingPurchase(
  orderId: string,
  opts: { stripePaymentIntentId?: string | null; stripeEventId?: string | null },
): Promise<void> {
  const serviceSupabase = createServiceSupabaseClient();
  const { error } = await serviceSupabase
    .from("pending_label_orders")
    .update({
      status: "paid_waiting_label_purchase",
      stripe_payment_intent_id: opts.stripePaymentIntentId ?? null,
      stripe_event_id: opts.stripeEventId ?? null,
      paid_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) throw new Error(error.message);
}

export async function markPendingLabelOrderActionRequired(
  orderId: string,
  errorMessage: string,
): Promise<void> {
  const serviceSupabase = createServiceSupabaseClient();
  const { error } = await serviceSupabase
    .from("pending_label_orders")
    .update({
      status: "action_required",
      error_message: errorMessage,
      processed_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) throw new Error(error.message);
}

export async function markPendingLabelOrderRefundNeeded(
  orderId: string,
  errorMessage: string,
): Promise<void> {
  const serviceSupabase = createServiceSupabaseClient();
  const { error } = await serviceSupabase
    .from("pending_label_orders")
    .update({
      status: "refund_needed",
      error_message: errorMessage,
      processed_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) throw new Error(error.message);
}

export async function markPendingLabelOrderExpired(orderId: string): Promise<void> {
  const serviceSupabase = createServiceSupabaseClient();
  const { error } = await serviceSupabase
    .from("pending_label_orders")
    .update({ status: "expired" })
    .eq("id", orderId)
    .eq("status", "pending_payment");

  if (error) throw new Error(error.message);
}

// ── Admin helpers (service_role, no user_id restriction) ─────────────────────

export type AdminLabelOrderFilters = {
  status?: string;
  provider?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listPendingLabelOrdersForAdmin(
  filters: AdminLabelOrderFilters = {},
): Promise<{ orders: PendingLabelOrder[]; total: number }> {
  const serviceSupabase = createServiceSupabaseClient();
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 250);
  const offset = Math.max(filters.offset ?? 0, 0);

  let query = serviceSupabase
    .from("pending_label_orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.provider) {
    query = query.eq("provider", filters.provider);
  }
  if (filters.search) {
    const s = filters.search.trim();
    query = query.or(
      `stripe_checkout_session_id.ilike.%${s}%,stripe_payment_intent_id.ilike.%${s}%,tracking_number.ilike.%${s}%`,
    );
  }

  const { data, error, count } = await query.returns<Record<string, unknown>[]>();
  if (error) throw new Error(error.message);

  return {
    orders: (data ?? []).map(rowToOrder),
    total: count ?? 0,
  };
}

export async function getPendingLabelOrderByIdForAdmin(
  id: string,
): Promise<PendingLabelOrder | null> {
  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase
    .from("pending_label_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle<Record<string, unknown>>();

  if (error) throw new Error(error.message);
  return data ? rowToOrder(data) : null;
}

const ACTION_REQUIRED_ALLOWED: PendingLabelOrderStatus[] = [
  "pending_payment",
  "paid_test_mode",
  "paid_waiting_label_purchase",
  "label_purchase_pending",
];

const REFUND_NEEDED_ALLOWED: PendingLabelOrderStatus[] = [
  "paid_test_mode",
  "paid_waiting_label_purchase",
  "label_purchase_pending",
  "action_required",
];

export async function adminMarkActionRequired(
  orderId: string,
  reason: string,
): Promise<PendingLabelOrder> {
  const serviceSupabase = createServiceSupabaseClient();

  const { data: current, error: fetchError } = await serviceSupabase
    .from("pending_label_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle<Record<string, unknown>>();

  if (fetchError) throw new Error(fetchError.message);
  if (!current) throw new Error("Order not found.");

  const currentStatus = current.status as PendingLabelOrderStatus;
  if (!ACTION_REQUIRED_ALLOWED.includes(currentStatus)) {
    throw new Error(
      `Cannot mark action_required from status '${currentStatus}'. Allowed: ${ACTION_REQUIRED_ALLOWED.join(", ")}.`,
    );
  }

  const { data, error } = await serviceSupabase
    .from("pending_label_orders")
    .update({
      status: "action_required",
      error_message: reason,
      processed_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("*")
    .single<Record<string, unknown>>();

  if (error || !data) throw new Error(error?.message ?? "Failed to update order.");
  return rowToOrder(data);
}

export async function adminMarkRefundNeeded(
  orderId: string,
  reason: string,
): Promise<PendingLabelOrder> {
  const serviceSupabase = createServiceSupabaseClient();

  const { data: current, error: fetchError } = await serviceSupabase
    .from("pending_label_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle<Record<string, unknown>>();

  if (fetchError) throw new Error(fetchError.message);
  if (!current) throw new Error("Order not found.");

  const currentStatus = current.status as PendingLabelOrderStatus;
  if (!REFUND_NEEDED_ALLOWED.includes(currentStatus)) {
    throw new Error(
      `Cannot mark refund_needed from status '${currentStatus}'. Allowed: ${REFUND_NEEDED_ALLOWED.join(", ")}.`,
    );
  }

  const { data, error } = await serviceSupabase
    .from("pending_label_orders")
    .update({
      status: "refund_needed",
      error_message: reason,
      processed_at: current.processed_at ?? new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("*")
    .single<Record<string, unknown>>();

  if (error || !data) throw new Error(error?.message ?? "Failed to update order.");
  return rowToOrder(data);
}

export async function markPendingLabelOrderRefundPending(
  orderId: string,
  reason: string,
): Promise<PendingLabelOrder> {
  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase
    .from("pending_label_orders")
    .update({
      status: "refund_pending",
      error_message: reason,
      refund_error_message: null,
      refund_attempted_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .in("status", ["refund_needed", "action_required", "paid_test_mode", "paid_waiting_label_purchase"])
    .select("*")
    .single<Record<string, unknown>>();

  if (error || !data) throw new Error(error?.message ?? "Failed to mark refund_pending.");
  return rowToOrder(data);
}

export async function markPendingLabelOrderRefunded(
  orderId: string,
  opts: { stripeRefundId?: string | null; reason?: string | null },
): Promise<PendingLabelOrder> {
  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase
    .from("pending_label_orders")
    .update({
      status: "refunded",
      stripe_refund_id: opts.stripeRefundId ?? null,
      refunded_at: new Date().toISOString(),
      refund_error_message: null,
      error_message: opts.reason ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("*")
    .single<Record<string, unknown>>();

  if (error || !data) throw new Error(error?.message ?? "Failed to mark refunded.");
  return rowToOrder(data);
}

export async function markPendingLabelOrderRefundFailed(
  orderId: string,
  errorMessage: string,
): Promise<PendingLabelOrder> {
  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase
    .from("pending_label_orders")
    .update({
      status: "refund_needed",
      refund_error_message: errorMessage,
      error_message: errorMessage,
      processed_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "refund_pending")
    .select("*")
    .single<Record<string, unknown>>();

  if (error || !data) throw new Error(error?.message ?? "Failed to mark refund failure.");
  return rowToOrder(data);
}

export async function adminMarkExpired(orderId: string): Promise<PendingLabelOrder> {
  const serviceSupabase = createServiceSupabaseClient();

  const { data: current, error: fetchError } = await serviceSupabase
    .from("pending_label_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle<Record<string, unknown>>();

  if (fetchError) throw new Error(fetchError.message);
  if (!current) throw new Error("Order not found.");

  if (current.status !== "pending_payment") {
    throw new Error(
      `Cannot mark expired from status '${current.status as string}'. Only pending_payment orders can be expired.`,
    );
  }

  const { data, error } = await serviceSupabase
    .from("pending_label_orders")
    .update({ status: "expired" })
    .eq("id", orderId)
    .select("*")
    .single<Record<string, unknown>>();

  if (error || !data) throw new Error(error?.message ?? "Failed to update order.");
  return rowToOrder(data);
}

export async function markPendingLabelOrderLabelPurchasePending(
  orderId: string,
): Promise<void> {
  const serviceSupabase = createServiceSupabaseClient();
  const { error } = await serviceSupabase
    .from("pending_label_orders")
    .update({
      status: "label_purchase_pending",
      processed_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .in("status", ["paid_waiting_label_purchase", "label_purchase_pending"]);

  if (error) throw new Error(error.message);
}

export async function claimPendingLabelOrderForPurchase(
  orderId: string,
  opts?: { allowTestMode?: boolean; allowActionRequiredRetry?: boolean },
): Promise<PendingLabelOrder | null> {
  const serviceSupabase = createServiceSupabaseClient();
  const allowedStatuses: PendingLabelOrderStatus[] = ["paid_waiting_label_purchase"];
  if (opts?.allowTestMode) allowedStatuses.push("paid_test_mode");
  if (opts?.allowActionRequiredRetry) allowedStatuses.push("action_required");

  const { data, error } = await serviceSupabase
    .from("pending_label_orders")
    .update({
      status: "label_purchase_pending",
      processed_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .in("status", allowedStatuses)
    .is("label_id", null)
    .is("shipment_id", null)
    .is("tracking_number", null)
    .select("*")
    .maybeSingle<Record<string, unknown>>();

  if (error) throw new Error(error.message);
  return data ? rowToOrder(data) : null;
}

export async function markPendingLabelOrderLabelPurchased(
  orderId: string,
  opts: {
    shipmentId: string;
    labelId?: string | null;
    trackingNumber: string;
  },
): Promise<void> {
  const serviceSupabase = createServiceSupabaseClient();
  const { error } = await serviceSupabase
    .from("pending_label_orders")
    .update({
      status: "label_purchased",
      shipment_id: opts.shipmentId,
      label_id: opts.labelId ?? null,
      tracking_number: opts.trackingNumber,
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", orderId);

  if (error) throw new Error(error.message);
}

export async function expireStalePendingLabelOrders(
  now?: Date,
): Promise<{ expiredCount: number }> {
  const serviceSupabase = createServiceSupabaseClient();
  const cutoff = (now ?? new Date()).toISOString();

  const { data, error } = await serviceSupabase
    .from("pending_label_orders")
    .update({ status: "expired" })
    .eq("status", "pending_payment")
    .lt("expires_at", cutoff)
    .is("paid_at", null)
    .select("id")
    .returns<{ id: string }[]>();

  if (error) throw new Error(error.message);
  return { expiredCount: (data ?? []).length };
}
