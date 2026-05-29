import Stripe from "stripe";
import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import { createAuditLog, createReconciliationEvent } from "@/lib/server/auditLog";
import {
  createServiceSupabaseClient,
  isServerSupabaseConfigured,
  isServiceRoleConfigured,
} from "@/lib/server/supabaseServer";
import { getStripeClient, getStripeWebhookSecret, isStripeConfigured, isStripeWebhookConfigured } from "@/lib/server/stripe";
import {
  getPendingLabelOrderByCheckoutSession,
  getPendingLabelOrderByIdForAdmin,
  markPendingLabelOrderPaidTestMode,
  markPendingLabelOrderPaidWaitingPurchase,
  markPendingLabelOrderActionRequired,
  markPendingLabelOrderExpired,
} from "@/lib/server/pendingLabelOrders";
import { purchaseLabelForPendingOrder } from "@/lib/server/labelPurchaseProcessor";
import {
  canProcessLabelInWebhookForUserId,
  canPurchaseRealLabelForUserId,
} from "@/lib/server/featureGates";

export const runtime = "nodejs";

// ── Wallet recharge types ─────────────────────────────────────────────────────

type PaymentRechargeRow = {
  id: string;
  user_id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_event_id: string | null;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "canceled" | "refunded" | string;
  balance_movement_id: string | null;
  metadata?: Record<string, unknown> | null;
};

type PrepOrderPaymentRow = {
  id: string;
  user_id: string;
  status: string;
  final_total: number | null;
  payment_status: string | null;
  payment_method: string | null;
  paid_amount: number | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  metadata?: Record<string, unknown> | null;
};

// ── Shared utilities ──────────────────────────────────────────────────────────

function paymentIntentId(value: Stripe.Checkout.Session["payment_intent"] | Stripe.PaymentIntent["id"] | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function centsToDollars(value: number | null | undefined) {
  return Number(((value ?? 0) / 100).toFixed(2));
}

async function auditStripeWebhook(
  eventType: string,
  severity: "info" | "warning" | "error" | "critical",
  message: string,
  metadata: Record<string, unknown>,
) {
  await createAuditLog({
    eventType,
    severity,
    entityType: "balance_movement",
    message,
    metadata,
  });
}

// ── Wallet recharge handler ───────────────────────────────────────────────────

async function handleWalletRechargeCompleted(event: Stripe.Event, session: Stripe.Checkout.Session) {
  const serviceSupabase = createServiceSupabaseClient();
  const checkoutSessionId = session.id;
  const stripePaymentIntentId = paymentIntentId(session.payment_intent);
  const amount = centsToDollars(session.amount_total);
  const currency = session.currency?.toLowerCase() ?? "";

  await createAuditLog({
    eventType: "payment_webhook_received",
    severity: "info",
    entityType: "balance_movement",
    message: "Stripe checkout.session.completed webhook received.",
    metadata: {
      stripeEventId: event.id,
      stripeCheckoutSessionId: checkoutSessionId,
      stripePaymentIntentId,
      amount,
      currency,
      paymentStatus: session.payment_status,
    },
  }, serviceSupabase);

  if (session.payment_status !== "paid") {
    await createAuditLog({
      eventType: "payment_checkout_failed",
      severity: "warning",
      entityType: "balance_movement",
      message: "Stripe checkout completed without paid status.",
      metadata: { stripeEventId: event.id, stripeCheckoutSessionId: checkoutSessionId, paymentStatus: session.payment_status },
    }, serviceSupabase);
    return { ignored: true };
  }

  const { data: recharge, error: rechargeError } = await serviceSupabase
    .from("payment_recharges")
    .select("id,user_id,stripe_checkout_session_id,stripe_payment_intent_id,stripe_event_id,amount,currency,status,balance_movement_id,metadata")
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .maybeSingle<PaymentRechargeRow>();

  if (rechargeError || !recharge) {
    await createReconciliationEvent({
      eventType: "payment_recharge_db_failed",
      entityType: "balance_movement",
      requestId: event.id,
      message: "Stripe payment succeeded but recharge record was not found.",
      metadata: { stripeEventId: event.id, stripeCheckoutSessionId: checkoutSessionId, stripePaymentIntentId },
    }, serviceSupabase);
    throw new Error("Stripe payment succeeded but recharge record was not found.");
  }

  if (recharge.status === "paid" && recharge.balance_movement_id) {
    await createAuditLog({
      userId: recharge.user_id,
      eventType: "payment_recharge_duplicate_ignored",
      severity: "warning",
      entityType: "balance_movement",
      entityId: recharge.balance_movement_id,
      requestId: event.id,
      message: "Duplicate Stripe recharge webhook ignored.",
      metadata: { stripeEventId: event.id, stripeCheckoutSessionId: checkoutSessionId, rechargeId: recharge.id },
    }, serviceSupabase);
    return { duplicate: true };
  }

  if (recharge.stripe_event_id === event.id && recharge.balance_movement_id) {
    return { duplicate: true };
  }

  if (currency !== "usd" || recharge.currency !== "usd" || Number(recharge.amount) !== amount) {
    await createReconciliationEvent({
      userId: recharge.user_id,
      eventType: "payment_recharge_amount_mismatch",
      entityType: "balance_movement",
      entityId: recharge.id,
      requestId: event.id,
      message: "Stripe recharge amount or currency did not match the pending record.",
      metadata: {
        stripeEventId: event.id,
        stripeCheckoutSessionId: checkoutSessionId,
        expectedAmount: Number(recharge.amount),
        receivedAmount: amount,
        expectedCurrency: recharge.currency,
        receivedCurrency: currency,
      },
    }, serviceSupabase);
    throw new Error("Stripe recharge amount mismatch.");
  }

  const idempotencyKey = `stripe-event:${event.id}`;
  const referenceId = stripePaymentIntentId ?? checkoutSessionId;
  const { data: existingMovement, error: existingMovementError } = await serviceSupabase
    .from("balance_movements")
    .select("id")
    .eq("user_id", recharge.user_id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle<{ id: string }>();

  if (existingMovementError) throw existingMovementError;

  const { data: existingReferenceMovement, error: existingReferenceMovementError } = await serviceSupabase
    .from("balance_movements")
    .select("id")
    .eq("user_id", recharge.user_id)
    .eq("reference_type", "stripe_checkout")
    .eq("reference_id", referenceId)
    .maybeSingle<{ id: string }>();

  if (existingReferenceMovementError) throw existingReferenceMovementError;

  const movementId = existingMovement?.id ?? existingReferenceMovement?.id ?? `MOV-${crypto.randomUUID()}`;

  if (!existingMovement && !existingReferenceMovement) {
    const { error: movementError } = await serviceSupabase.from("balance_movements").insert({
      id: movementId,
      user_id: recharge.user_id,
      concept: "Payment recharge",
      amount,
      type: "recharge",
      reference_type: "stripe_checkout",
      reference_id: referenceId,
      idempotency_key: idempotencyKey,
      created_by: recharge.user_id,
      metadata: {
        source: "stripe_webhook",
        stripeEventId: event.id,
        stripeCheckoutSessionId: checkoutSessionId,
        stripePaymentIntentId,
        amount,
        currency,
      },
    });

    if (movementError) {
      await createReconciliationEvent({
        userId: recharge.user_id,
        eventType: "payment_recharge_db_failed",
        entityType: "balance_movement",
        entityId: recharge.id,
        requestId: event.id,
        message: "Stripe payment succeeded but balance movement insert failed.",
        metadata: {
          stripeEventId: event.id,
          stripeCheckoutSessionId: checkoutSessionId,
          stripePaymentIntentId,
          error: movementError.message,
        },
      }, serviceSupabase);
      throw movementError;
    }
  }

  const { error: updateError } = await serviceSupabase
    .from("payment_recharges")
    .update({
      status: "paid",
      stripe_payment_intent_id: stripePaymentIntentId,
      stripe_event_id: event.id,
      balance_movement_id: movementId,
      metadata: {
        ...(recharge.metadata ?? {}),
        source: "stripe_webhook",
        stripeEventId: event.id,
        stripeCheckoutSessionId: checkoutSessionId,
        stripePaymentIntentId,
        amount,
        currency,
        paymentStatus: session.payment_status,
      },
    })
    .eq("id", recharge.id);

  if (updateError) {
    await createReconciliationEvent({
      userId: recharge.user_id,
      eventType: "payment_recharge_db_failed",
      entityType: "balance_movement",
      entityId: movementId,
      requestId: event.id,
      message: "Stripe payment succeeded and balance was credited, but recharge record update failed.",
      metadata: {
        stripeEventId: event.id,
        stripeCheckoutSessionId: checkoutSessionId,
        stripePaymentIntentId,
        rechargeId: recharge.id,
        error: updateError.message,
      },
    }, serviceSupabase);
    throw updateError;
  }

  await createAuditLog({
    userId: recharge.user_id,
    eventType: "payment_recharge_succeeded",
    severity: "info",
    entityType: "balance_movement",
    entityId: movementId,
    requestId: event.id,
    message: "Stripe recharge credited to balance.",
    metadata: { stripeEventId: event.id, stripeCheckoutSessionId: checkoutSessionId, stripePaymentIntentId, amount, currency },
  }, serviceSupabase);

  return { credited: true };
}

// ── Prep quote payment handler ───────────────────────────────────────────────

async function handlePrepOrderCheckoutCompleted(event: Stripe.Event, session: Stripe.Checkout.Session) {
  const serviceSupabase = createServiceSupabaseClient();
  const metadata = session.metadata ?? {};
  const prepOrderId = metadata.prep_order_id;
  const expectedUserId = metadata.user_id;
  const stripePaymentIntentId = paymentIntentId(session.payment_intent);
  const amountTotal = session.amount_total ?? 0;
  const currency = session.currency?.toLowerCase() ?? "";

  await createAuditLog({
    eventType: "prep_payment_webhook_received",
    severity: "info",
    entityType: "prep_order",
    entityId: typeof prepOrderId === "string" ? prepOrderId : undefined,
    requestId: event.id,
    message: "Stripe Prep checkout.session.completed received.",
    metadata: {
      stripeEventId: event.id,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId,
      amountTotal,
      currency,
      paymentStatus: session.payment_status,
    },
  }, serviceSupabase);

  if (session.payment_status !== "paid") {
    return { ignored: true };
  }

  if (!prepOrderId || typeof prepOrderId !== "string") {
    await createReconciliationEvent({
      eventType: "prep_payment_missing_metadata",
      entityType: "prep_order",
      requestId: event.id,
      message: "Prep payment session missing prep_order_id metadata.",
      metadata: { stripeEventId: event.id, stripeCheckoutSessionId: session.id },
    }, serviceSupabase);
    throw new Error("Prep payment session is missing prep_order_id.");
  }

  const { data: order, error } = await serviceSupabase
    .from("prep_orders")
    .select("id,user_id,status,final_total,payment_status,payment_method,paid_amount,stripe_checkout_session_id,stripe_payment_intent_id,metadata")
    .eq("id", prepOrderId)
    .maybeSingle<PrepOrderPaymentRow>();
  if (error) throw error;
  if (!order) {
    await createReconciliationEvent({
      eventType: "prep_payment_order_not_found",
      entityType: "prep_order",
      requestId: event.id,
      message: "Stripe Prep payment succeeded but prep_order was not found.",
      metadata: { stripeEventId: event.id, stripeCheckoutSessionId: session.id, prepOrderId },
    }, serviceSupabase);
    throw new Error("Prep order not found for this Stripe session.");
  }

  if (expectedUserId && expectedUserId !== order.user_id) {
    await createReconciliationEvent({
      userId: order.user_id,
      eventType: "prep_payment_user_mismatch",
      entityType: "prep_order",
      entityId: order.id,
      requestId: event.id,
      message: "Prep payment user_id in Stripe metadata does not match order user_id.",
      metadata: { stripeEventId: event.id, prepOrderId: order.id },
    }, serviceSupabase);
    throw new Error("User ID mismatch on Prep payment.");
  }

  if (order.payment_status === "paid") {
    await createAuditLog({
      userId: order.user_id,
      eventType: "prep_payment_duplicate_ignored",
      severity: "warning",
      entityType: "prep_order",
      entityId: order.id,
      requestId: event.id,
      message: "Duplicate Prep payment webhook ignored.",
      metadata: { stripeEventId: event.id, stripeCheckoutSessionId: session.id, prepOrderId: order.id },
    }, serviceSupabase);
    return { duplicate: true };
  }

  if (currency !== "usd" || amountTotal !== (order.final_total ?? 0)) {
    await createReconciliationEvent({
      userId: order.user_id,
      eventType: "prep_payment_amount_mismatch",
      entityType: "prep_order",
      entityId: order.id,
      requestId: event.id,
      message: "Stripe Prep payment amount or currency did not match final quote.",
      metadata: {
        stripeEventId: event.id,
        expectedAmountCents: order.final_total,
        receivedAmountCents: amountTotal,
        receivedCurrency: currency,
      },
    }, serviceSupabase);
    throw new Error("Prep payment amount mismatch.");
  }

  const nextStatus = order.status === "quote_requested" || order.status === "under_review"
    ? "awaiting_inventory"
    : order.status;
  const now = new Date().toISOString();
  const { error: updateError } = await serviceSupabase
    .from("prep_orders")
    .update({
      status: nextStatus,
      payment_status: "paid",
      payment_method: "card",
      paid_amount: amountTotal,
      paid_at: now,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: stripePaymentIntentId,
      payment_reference: stripePaymentIntentId ?? session.id,
      quote_accepted_at: now,
      metadata: {
        ...(order.metadata ?? {}),
        prepPayment: {
          source: "stripe_webhook",
          stripeEventId: event.id,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId,
        },
      },
    })
    .eq("id", order.id)
    .neq("payment_status", "paid");
  if (updateError) throw updateError;

  await serviceSupabase.from("prep_order_events").insert({
    prep_order_id: order.id,
    visibility: "customer",
    status: nextStatus,
    title: "Payment received",
    message: "Your Prep quote has been paid by card. SendiFlash will continue managing the prep process.",
    created_by: order.user_id,
  });

  await createAuditLog({
    userId: order.user_id,
    eventType: "prep_payment_succeeded",
    severity: "info",
    entityType: "prep_order",
    entityId: order.id,
    requestId: event.id,
    message: "Prep card payment recorded.",
    metadata: { stripeEventId: event.id, stripeCheckoutSessionId: session.id, stripePaymentIntentId, amountTotal },
  }, serviceSupabase);

  return { paid: true };
}

// ── Label direct payment handler ──────────────────────────────────────────────
// FASE 5.39B: handles checkout.session.completed for purpose=label_direct_payment.
// FASE 5.40B+: optional server-side label purchase after paid_waiting_label_purchase,
// guarded by ENABLE_REAL_LABEL_PURCHASE and ENABLE_PROCESS_LABEL_IN_WEBHOOK.
//
// Frontend MUST NOT purchase a label from the success_url.
// The actual label purchase is a server-side-only operation after ENABLE_REAL_LABEL_PURCHASE=true.

async function handleLabelDirectPaymentCompleted(event: Stripe.Event, session: Stripe.Checkout.Session) {
  const serviceSupabase = createServiceSupabaseClient();
  const checkoutSessionId = session.id;
  const stripePaymentIntentId = paymentIntentId(session.payment_intent);
  const metadata = session.metadata ?? {};

  const pendingLabelOrderId = metadata.pending_label_order_id;
  const expectedUserId = metadata.user_id;

  await createAuditLog({
    eventType: "label_payment_webhook_received",
    severity: "info",
    entityType: "balance_movement",
    message: "Stripe label_direct_payment checkout.session.completed received.",
    metadata: {
      stripeEventId: event.id,
      stripeCheckoutSessionId: checkoutSessionId,
      stripePaymentIntentId,
      pendingLabelOrderId,
      paymentStatus: session.payment_status,
    },
  }, serviceSupabase);

  if (session.payment_status !== "paid") {
    await createAuditLog({
      eventType: "label_payment_not_paid",
      severity: "warning",
      entityType: "balance_movement",
      message: "Stripe label checkout completed without paid status — ignoring.",
      metadata: {
        stripeEventId: event.id,
        stripeCheckoutSessionId: checkoutSessionId,
        paymentStatus: session.payment_status,
        pendingLabelOrderId,
      },
    }, serviceSupabase);
    return { ignored: true };
  }

  if (!pendingLabelOrderId || typeof pendingLabelOrderId !== "string") {
    await createReconciliationEvent({
      eventType: "label_payment_missing_metadata",
      entityType: "balance_movement",
      requestId: event.id,
      message: "label_direct_payment session missing pending_label_order_id in metadata.",
      metadata: { stripeEventId: event.id, stripeCheckoutSessionId: checkoutSessionId },
    }, serviceSupabase);
    throw new Error("label_direct_payment session is missing pending_label_order_id.");
  }

  // Look up the pending order by Stripe session ID.
  const order = await getPendingLabelOrderByCheckoutSession(checkoutSessionId);

  if (!order) {
    await createReconciliationEvent({
      eventType: "label_payment_order_not_found",
      entityType: "balance_movement",
      requestId: event.id,
      message: "Stripe label payment succeeded but pending_label_order record was not found.",
      metadata: {
        stripeEventId: event.id,
        stripeCheckoutSessionId: checkoutSessionId,
        pendingLabelOrderId,
      },
    }, serviceSupabase);
    throw new Error("pending_label_order not found for this Stripe session.");
  }

  const realLabelPurchaseEnabled = process.env.ENABLE_REAL_LABEL_PURCHASE === "true";
  const processLabelInWebhookEnabled = process.env.ENABLE_PROCESS_LABEL_IN_WEBHOOK === "true";
  const canAttemptInlineFromPaidWaiting =
    realLabelPurchaseEnabled &&
    processLabelInWebhookEnabled &&
    order.status === "paid_waiting_label_purchase" &&
    !order.labelId &&
    !order.shipmentId &&
    !order.trackingNumber;

  // Idempotency: if already processed, ignore without error. When automatic
  // processing is enabled, a clean paid_waiting order is allowed to continue so
  // a Stripe retry can recover after payment was recorded but before label
  // processing completed.
  if (
    order.status === "paid_test_mode" ||
    (order.status === "paid_waiting_label_purchase" && !canAttemptInlineFromPaidWaiting) ||
    order.status === "label_purchase_pending" ||
    order.status === "label_purchased"
  ) {
    await createAuditLog({
      userId: order.userId,
      eventType: "label_payment_duplicate_ignored",
      severity: "warning",
      entityType: "balance_movement",
      entityId: order.id,
      requestId: event.id,
      message: "Duplicate label payment webhook ignored — order already processed.",
      metadata: { stripeEventId: event.id, stripeCheckoutSessionId: checkoutSessionId, orderId: order.id, currentStatus: order.status },
    }, serviceSupabase);
    return { duplicate: true };
  }

  // Validate user_id from metadata matches the order.
  if (expectedUserId && expectedUserId !== order.userId) {
    await createReconciliationEvent({
      userId: order.userId,
      eventType: "label_payment_user_mismatch",
      entityType: "balance_movement",
      entityId: order.id,
      requestId: event.id,
      message: "Label payment user_id in Stripe metadata does not match pending order user_id.",
      metadata: { stripeEventId: event.id, orderId: order.id },
    }, serviceSupabase);
    throw new Error("User ID mismatch on label payment.");
  }

  // Validate amount: Stripe amount_total (cents) must match order amount_cents.
  const receivedAmountCents = session.amount_total ?? 0;
  if (receivedAmountCents !== order.amountCents) {
    await createReconciliationEvent({
      userId: order.userId,
      eventType: "label_payment_amount_mismatch",
      entityType: "balance_movement",
      entityId: order.id,
      requestId: event.id,
      message: "Stripe label payment amount_total does not match pending order amount_cents.",
      metadata: {
        stripeEventId: event.id,
        orderId: order.id,
        expectedAmountCents: order.amountCents,
        receivedAmountCents,
      },
    }, serviceSupabase);
    throw new Error("Label payment amount mismatch.");
  }

  // Validate currency.
  const receivedCurrency = session.currency?.toLowerCase() ?? "";
  if (receivedCurrency !== order.currency.toLowerCase()) {
    await createReconciliationEvent({
      userId: order.userId,
      eventType: "label_payment_currency_mismatch",
      entityType: "balance_movement",
      entityId: order.id,
      requestId: event.id,
      message: "Stripe label payment currency does not match pending order currency.",
      metadata: { stripeEventId: event.id, orderId: order.id, expectedCurrency: order.currency, receivedCurrency },
    }, serviceSupabase);
    throw new Error("Label payment currency mismatch.");
  }

  // Determine next status based on ENABLE_REAL_LABEL_PURCHASE flag.
  //
  // FASE 5.39B: if ENABLE_REAL_LABEL_PURCHASE=false, mark as paid_test_mode.
  //   The payment was captured, but no label is purchased. This is for checkout flow QA only.
  //
  // FASE 5.39B: if ENABLE_REAL_LABEL_PURCHASE=true, mark as action_required with a TODO.
  //   Actual label purchase server-side is implemented in FASE 5.39C.
  //
  // Frontend MUST NOT use success_url to purchase the label.

  if (!realLabelPurchaseEnabled) {
    await markPendingLabelOrderPaidTestMode(order.id, {
      stripePaymentIntentId,
      stripeEventId: event.id,
    });
    await createAuditLog({
      userId: order.userId,
      eventType: "label_payment_paid_test_mode",
      severity: "info",
      entityType: "balance_movement",
      entityId: order.id,
      requestId: event.id,
      message: "Label payment captured in test mode — ENABLE_REAL_LABEL_PURCHASE=false, no label purchased.",
      metadata: { stripeEventId: event.id, stripeCheckoutSessionId: checkoutSessionId, orderId: order.id },
    }, serviceSupabase);
    return { testMode: true };
  }

  const ownerPurchaseGate = await canPurchaseRealLabelForUserId(order.userId);
  if (!ownerPurchaseGate.allowed) {
    await markPendingLabelOrderPaidWaitingPurchase(order.id, {
      stripePaymentIntentId,
      stripeEventId: event.id,
    });
    await markPendingLabelOrderActionRequired(
      order.id,
      "Real label purchase is not available for this account yet.",
    );
    await createAuditLog({
      userId: order.userId,
      eventType: "label_feature_gate_denied",
      severity: "warning",
      entityType: "balance_movement",
      entityId: order.id,
      requestId: event.id,
      message: "Label payment captured but real label purchase was blocked by account feature gate.",
      metadata: {
        stripeEventId: event.id,
        stripeCheckoutSessionId: checkoutSessionId,
        orderId: order.id,
        feature: "real_label_purchase",
        reason: ownerPurchaseGate.reason,
      },
    }, serviceSupabase);
    return { actionRequired: true };
  }

  // ENABLE_REAL_LABEL_PURCHASE=true path (FASE 5.40B):
  //   1. Mark order paid_waiting_label_purchase so support can see payment was captured.
  //   2. If ENABLE_PROCESS_LABEL_IN_WEBHOOK=true, invoke the processor immediately.
  //      Default is false — doing a carrier API call inside a webhook adds latency and
  //      risks the webhook timing out before the response. Use the admin process-label
  //      endpoint for controlled manual trigger.

  await markPendingLabelOrderPaidWaitingPurchase(order.id, {
    stripePaymentIntentId,
    stripeEventId: event.id,
  });
  await createAuditLog({
    userId: order.userId,
    eventType: "label_payment_paid_waiting_purchase",
    severity: "info",
    entityType: "balance_movement",
    entityId: order.id,
    requestId: event.id,
    message: "Label payment captured — order set to paid_waiting_label_purchase.",
    metadata: { stripeEventId: event.id, stripeCheckoutSessionId: checkoutSessionId, orderId: order.id },
  }, serviceSupabase);

  if (!processLabelInWebhookEnabled) {
    return { waitingPurchase: true };
  }

  const webhookProcessingGate = await canProcessLabelInWebhookForUserId(order.userId);
  if (!webhookProcessingGate.allowed) {
    await createAuditLog({
      userId: order.userId,
      eventType: "label_feature_gate_denied",
      severity: "warning",
      entityType: "balance_movement",
      entityId: order.id,
      requestId: event.id,
      message: "Inline label purchase in webhook blocked by feature gate.",
      metadata: {
        stripeEventId: event.id,
        stripeCheckoutSessionId: checkoutSessionId,
        orderId: order.id,
        feature: "process_label_in_webhook",
        reason: webhookProcessingGate.reason,
      },
    }, serviceSupabase);
    return { waitingPurchase: true, inlineProcessingBlocked: true };
  }

  // Webhook-inline label purchase (ENABLE_PROCESS_LABEL_IN_WEBHOOK=true).
  // Risk: carrier API call inside webhook — may exceed Stripe's 30s response window.
  // Only enable after confirming carrier latency is acceptable in staging.
  try {
    const purchaseResult = await purchaseLabelForPendingOrder(order.id, {
      carrierFailureStatus: "action_required",
    });
    await createAuditLog({
      userId: order.userId,
      eventType: "label_payment_label_purchased_inline",
      severity: "info",
      entityType: "balance_movement",
      entityId: order.id,
      requestId: event.id,
      message: "Label purchased inline in Stripe webhook.",
      metadata: {
        stripeEventId: event.id,
        orderId: order.id,
        shipmentId: purchaseResult.shipmentId,
        trackingNumber: purchaseResult.trackingNumber,
      },
    }, serviceSupabase);
    return { labelPurchased: true, trackingNumber: purchaseResult.trackingNumber };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err ?? "unknown");
    const latest = await getPendingLabelOrderByIdForAdmin(order.id).catch(() => null);

    if (
      latest?.status === "paid_waiting_label_purchase" ||
      latest?.status === "paid_test_mode"
    ) {
      await markPendingLabelOrderActionRequired(
        latest.id,
        `Automatic label purchase failed: ${errorMessage}`,
      );
    }

    // Processor already sets most controlled failures to action_required. Log
    // here too so the webhook error path is traceable and Stripe still receives
    // a 200 response.
    await createAuditLog({
      userId: order.userId,
      eventType: "label_payment_inline_purchase_failed",
      severity: "error",
      entityType: "balance_movement",
      entityId: order.id,
      requestId: event.id,
      message: "Inline label purchase failed in Stripe webhook — see order status for details.",
      metadata: {
        stripeEventId: event.id,
        orderId: order.id,
        error: errorMessage,
      },
    }, serviceSupabase);
    // Return 200 to Stripe — the order is in a terminal failure state; Stripe should not retry.
    return { inlinePurchaseFailed: true };
  }
}

// ── Dispatcher: checkout.session.completed ────────────────────────────────────

async function handleCompletedCheckout(event: Stripe.Event, session: Stripe.Checkout.Session) {
  const purpose = session.metadata?.purpose;
  const type = session.metadata?.type;

  if (purpose === "label_direct_payment") {
    return handleLabelDirectPaymentCompleted(event, session);
  }

  if (type === "prep_order" || purpose === "prep_order") {
    return handlePrepOrderCheckoutCompleted(event, session);
  }

  // Default: wallet recharge (no purpose, or purpose=wallet_recharge for future).
  return handleWalletRechargeCompleted(event, session);
}

// ── Checkout expired ──────────────────────────────────────────────────────────

async function handleExpiredCheckout(event: Stripe.Event, session: Stripe.Checkout.Session) {
  const serviceSupabase = createServiceSupabaseClient();
  const purpose = session.metadata?.purpose;
  const type = session.metadata?.type;

  if (purpose === "label_direct_payment") {
    // Mark the pending label order as expired.
    const order = await getPendingLabelOrderByCheckoutSession(session.id);
    if (order && order.status === "pending_payment") {
      await markPendingLabelOrderExpired(order.id);
    }
    await createAuditLog({
      eventType: "label_payment_expired",
      severity: "warning",
      entityType: "balance_movement",
      requestId: event.id,
      message: "Stripe label checkout expired before payment.",
      metadata: { stripeEventId: event.id, stripeCheckoutSessionId: session.id, orderId: order?.id },
    }, serviceSupabase);
    return;
  }

  if (type === "prep_order" || purpose === "prep_order") {
    const prepOrderId = session.metadata?.prep_order_id;
    if (prepOrderId) {
      const { error } = await serviceSupabase
        .from("prep_orders")
        .update({
          payment_status: "failed",
          metadata: {
            source: "stripe_webhook",
            stripeEventId: event.id,
            stripeCheckoutSessionId: session.id,
            reason: "checkout_expired",
          },
        })
        .eq("id", prepOrderId)
        .eq("payment_status", "pending");
      if (error) throw error;
    }
    await createAuditLog({
      eventType: "prep_payment_expired",
      severity: "warning",
      entityType: "prep_order",
      entityId: typeof prepOrderId === "string" ? prepOrderId : undefined,
      requestId: event.id,
      message: "Stripe Prep checkout expired before payment.",
      metadata: { stripeEventId: event.id, stripeCheckoutSessionId: session.id, prepOrderId },
    }, serviceSupabase);
    return;
  }

  // Default: wallet recharge expiry.
  const { error } = await serviceSupabase
    .from("payment_recharges")
    .update({
      status: "canceled",
      stripe_event_id: event.id,
      metadata: {
        source: "stripe_webhook",
        stripeEventId: event.id,
        stripeCheckoutSessionId: session.id,
        reason: "checkout_expired",
      },
    })
    .eq("stripe_checkout_session_id", session.id)
    .eq("status", "pending");

  if (error) throw error;
  await createAuditLog({
    eventType: "payment_checkout_failed",
    severity: "warning",
    entityType: "balance_movement",
    requestId: event.id,
    message: "Stripe checkout expired before payment.",
    metadata: { stripeEventId: event.id, stripeCheckoutSessionId: session.id },
  }, serviceSupabase);
}

// ── Payment intent failed ─────────────────────────────────────────────────────

async function handlePaymentFailed(event: Stripe.Event, paymentIntent: Stripe.PaymentIntent) {
  const serviceSupabase = createServiceSupabaseClient();
  const id = paymentIntent.id;
  if (paymentIntent.metadata?.type === "prep_order" || paymentIntent.metadata?.purpose === "prep_order") {
    const prepOrderId = paymentIntent.metadata?.prep_order_id;
    if (prepOrderId) {
      const { error } = await serviceSupabase
        .from("prep_orders")
        .update({
          payment_status: "failed",
          stripe_payment_intent_id: id,
          metadata: {
            source: "stripe_webhook",
            stripeEventId: event.id,
            stripePaymentIntentId: id,
            reason: "payment_intent_failed",
          },
        })
        .eq("id", prepOrderId)
        .eq("payment_status", "pending");
      if (error) throw error;
    }
    await createAuditLog({
      eventType: "prep_payment_failed",
      severity: "warning",
      entityType: "prep_order",
      entityId: typeof prepOrderId === "string" ? prepOrderId : undefined,
      requestId: event.id,
      message: "Stripe Prep payment intent failed.",
      metadata: { stripeEventId: event.id, stripePaymentIntentId: id, prepOrderId },
    }, serviceSupabase);
    return;
  }

  const rechargeId = typeof paymentIntent.metadata?.rechargeId === "string" ? paymentIntent.metadata.rechargeId : null;
  const query = serviceSupabase
    .from("payment_recharges")
    .update({
      status: "failed",
      stripe_event_id: event.id,
      metadata: {
        source: "stripe_webhook",
        stripeEventId: event.id,
        stripePaymentIntentId: id,
        reason: "payment_intent_failed",
      },
    });

  const { error } = rechargeId
    ? await query.eq("id", rechargeId).eq("status", "pending")
    : await query.eq("stripe_payment_intent_id", id).eq("status", "pending");

  if (error) throw error;
  await createAuditLog({
    eventType: "payment_checkout_failed",
    severity: "warning",
    entityType: "balance_movement",
    requestId: event.id,
    message: "Stripe payment intent failed.",
    metadata: { stripeEventId: event.id, stripePaymentIntentId: id },
  }, serviceSupabase);
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured || !isStripeConfigured || !isStripeWebhookConfigured) {
    return apiError("Stripe webhook is not configured.", 503);
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return apiError("Missing Stripe signature.", 400);
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
  } catch {
    await auditStripeWebhook("payment_recharge_signature_failed", "warning", "Stripe webhook signature verification failed.", {
      hasSignature: Boolean(signature),
    });
    return apiError("Invalid Stripe signature.", 400);
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCompletedCheckout(event, event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "checkout.session.expired") {
      await handleExpiredCheckout(event, event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "payment_intent.payment_failed") {
      await handlePaymentFailed(event, event.data.object as Stripe.PaymentIntent);
    }

    return apiSuccess({ received: true });
  } catch (error) {
    console.error("[StripeWebhookFailed]", {
      eventType: event.type,
      eventId: event.id,
      message: error instanceof Error ? error.message : String(error ?? "unknown"),
    });
    return apiError("Stripe webhook could not be processed.", 500);
  }
}
