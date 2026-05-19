import Stripe from "stripe";
import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import { createAuditLog, createReconciliationEvent } from "@/lib/server/auditLog";
import {
  createServiceSupabaseClient,
  isServerSupabaseConfigured,
  isServiceRoleConfigured,
} from "@/lib/server/supabaseServer";
import { getStripeClient, getStripeWebhookSecret, isStripeConfigured, isStripeWebhookConfigured } from "@/lib/server/stripe";

export const runtime = "nodejs";

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

async function handleCompletedCheckout(event: Stripe.Event, session: Stripe.Checkout.Session) {
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

async function handleExpiredCheckout(event: Stripe.Event, session: Stripe.Checkout.Session) {
  const serviceSupabase = createServiceSupabaseClient();
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

async function handlePaymentFailed(event: Stripe.Event, paymentIntent: Stripe.PaymentIntent) {
  const serviceSupabase = createServiceSupabaseClient();
  const id = paymentIntent.id;
  const { error } = await serviceSupabase
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
    })
    .eq("stripe_payment_intent_id", id)
    .eq("status", "pending");

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
