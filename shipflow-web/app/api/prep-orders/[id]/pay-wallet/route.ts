import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { getAvailableBalance } from "@/lib/server/shipments/createInternalShipment";
import {
  createServiceSupabaseClient,
  isServerSupabaseConfigured,
  isServiceRoleConfigured,
  requireVerifiedUser,
} from "@/lib/server/supabaseServer";
import { canPayPrepOrder } from "@/lib/prep";
import { loadPrepOrderDetails, type PrepOrderRow } from "@/lib/server/prepOrders";
import { requirePrepBetaAccess } from "@/lib/server/prepAccess";

function centsToDollars(value: number) {
  return Number((value / 100).toFixed(2));
}

async function loadOwnedPrepOrder(userId: string, id: string) {
  const serviceSupabase = createServiceSupabaseClient();
  const { data: order, error } = await serviceSupabase
    .from("prep_orders")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle<PrepOrderRow>();
  if (error) throw error;
  return { serviceSupabase, order };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Prep payment is not configured correctly.", 503);
  }

  try {
    const { supabase, user } = await requireVerifiedUser(request);
    await requirePrepBetaAccess(supabase, user);
    const { id } = await params;
    const { serviceSupabase, order } = await loadOwnedPrepOrder(user.id, id);
    if (!order) return apiError("Prep order not found.", 404);

    const finalTotalCents = order.final_total ?? 0;
    const finalTotal = centsToDollars(finalTotalCents);
    if (!canPayPrepOrder({ status: order.status, finalTotal, paymentStatus: order.payment_status as never })) {
      return apiError("This Prep quote is not payable right now.", 400);
    }

    const availableBalance = await getAvailableBalance(serviceSupabase, user.id);
    if (availableBalance < finalTotal) {
      return apiError("Insufficient wallet balance for this Prep quote.", 402);
    }

    const idempotencyKey = `prep-wallet:${order.id}`;
    const { data: existingMovement, error: existingMovementError } = await serviceSupabase
      .from("balance_movements")
      .select("id")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle<{ id: string }>();
    if (existingMovementError) throw existingMovementError;

    const movementId = existingMovement?.id ?? `MOV-${crypto.randomUUID()}`;
    if (!existingMovement) {
      const { error: movementError } = await serviceSupabase.from("balance_movements").insert({
        id: movementId,
        user_id: user.id,
        concept: `SendiFlash Prep ${order.id.slice(0, 8)}`,
        amount: -finalTotal,
        type: "debit",
        reference_type: "prep_order",
        reference_id: order.id,
        idempotency_key: idempotencyKey,
        created_by: user.id,
        metadata: {
          source: "prep_wallet_payment",
          prepOrderId: order.id,
          finalTotalCents,
        },
      });
      if (movementError) throw movementError;
    }

    const nextStatus = order.status === "quote_requested" || order.status === "under_review"
      ? "awaiting_inventory"
      : order.status;
    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await serviceSupabase
      .from("prep_orders")
      .update({
        status: nextStatus,
        payment_status: "paid",
        payment_method: "wallet",
        paid_amount: finalTotalCents,
        paid_at: now,
        payment_reference: movementId,
        quote_accepted_at: order.quote_accepted_at ?? now,
      })
      .eq("id", order.id)
      .eq("user_id", user.id)
      .in("payment_status", ["unpaid", "failed"])
      .select("*")
      .maybeSingle<PrepOrderRow>();
    if (updateError) throw updateError;
    if (!updated) return apiError("This Prep order was already paid or changed state. Refresh and try again.", 409);

    await serviceSupabase.from("prep_order_events").insert({
      prep_order_id: order.id,
      visibility: "customer",
      status: nextStatus,
      title: "Payment received",
      message: "Your Prep quote has been paid from wallet balance. SendiFlash will continue managing the prep process.",
      created_by: user.id,
    });

    return apiSuccess({
      order: await loadPrepOrderDetails(serviceSupabase, updated, false),
      movementId,
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not pay this Prep quote with wallet.");
  }
}
