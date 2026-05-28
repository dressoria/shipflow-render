// FASE 5.39B — Label direct payment via Stripe Checkout.
//
// Enabled only when ENABLE_DIRECT_LABEL_PAYMENT=true.
// Even when enabled, the webhook does NOT purchase a real label unless
// ENABLE_REAL_LABEL_PURCHASE=true is also set.
//
// Flow:
//   1. Validate auth + email verification
//   2. Parse and validate body (provider, rate snapshot, addresses, parcel)
//   3. Compute amount_cents server-side from rate snapshot (never trust client price)
//   4. Insert pending_label_orders row (service_role, status=pending_payment)
//   5. Create Stripe Checkout Session (mode=payment, metadata.purpose=label_direct_payment)
//   6. Store stripe_checkout_session_id on the order
//   7. Return { checkoutUrl, pendingLabelOrderId }
//
// The actual label purchase happens in app/api/webhooks/stripe/route.ts
// AFTER checkout.session.completed fires AND ENABLE_REAL_LABEL_PURCHASE=true.
// Frontend MUST NOT purchase a label from the success_url.

import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import {
  createServiceSupabaseClient,
  isServerSupabaseConfigured,
  isServiceRoleConfigured,
  requireVerifiedUser,
} from "@/lib/server/supabaseServer";
import { isStripeConfigured, getStripeClient } from "@/lib/server/stripe";
import {
  createPendingLabelOrder,
  updatePendingLabelOrderCheckoutSession,
} from "@/lib/server/pendingLabelOrders";
import { createAuditLog } from "@/lib/server/auditLog";
import { canUseDirectLabelPayment } from "@/lib/server/featureGates";
import { assertLabelCheckoutRateLimit, RateLimitError } from "@/lib/server/rateLimit";
import { calculateCustomerPrice } from "@/lib/logistics/pricing";
import type {
  PendingLabelOrderRateSnapshot,
  PendingLabelOrderParcel,
  StructuredAddress,
} from "@/lib/types";

export const runtime = "nodejs";

type LabelCheckoutBody = {
  provider: string;
  serviceCode?: string;
  serviceName?: string;
  rateSnapshot: PendingLabelOrderRateSnapshot;
  origin: StructuredAddress;
  destination: StructuredAddress;
  parcel: PendingLabelOrderParcel;
  idempotencyKey?: string;
};

function isValidRateSnapshot(v: unknown): v is PendingLabelOrderRateSnapshot {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.provider === "string" && s.provider.trim().length > 0 &&
    typeof s.serviceCode === "string" && s.serviceCode.trim().length > 0 &&
    typeof s.carrierCode === "string" && s.carrierCode.trim().length > 0 &&
    typeof s.providerCost === "number" && s.providerCost > 0 &&
    typeof s.customerPrice === "number" && s.customerPrice > 0 &&
    typeof s.currency === "string" && s.currency.trim().length > 0
  );
}

function isValidAddress(v: unknown): v is StructuredAddress {
  if (!v || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  return (
    typeof a.street1 === "string" && a.street1.trim().length > 0 &&
    typeof a.city === "string" && a.city.trim().length > 0 &&
    typeof a.state === "string" && a.state.trim().length > 0 &&
    typeof a.postalCode === "string" && a.postalCode.trim().length > 0
  );
}

function isValidParcel(v: unknown): v is PendingLabelOrderParcel {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.weight === "number" && p.weight > 0 &&
    typeof p.weightUnit === "string" && p.weightUnit.trim().length > 0 &&
    typeof p.length === "number" && p.length > 0 &&
    typeof p.width === "number" && p.width > 0 &&
    typeof p.height === "number" && p.height > 0 &&
    typeof p.dimensionUnit === "string" && p.dimensionUnit.trim().length > 0
  );
}

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  if (!isStripeConfigured) {
    return apiError("Payment provider is not configured.", 503);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    return apiError("Server URL is not configured.", 503);
  }

  // Auth guard — must be authenticated and email-verified.
  let userId: string;
  let userEmail: string | null;
  try {
    const { user } = await requireVerifiedUser(request);
    userId = user.id;
    userEmail = user.email ?? null;
  } catch (error) {
    if (error instanceof Response) {
      return apiError((await error.text()) || "Unauthorized.", error.status);
    }
    return apiError("Authentication failed.", 401);
  }

  const directPaymentGate = canUseDirectLabelPayment({ id: userId, email: userEmail });
  if (!directPaymentGate.allowed) {
    await createAuditLog({
      userId,
      eventType: "label_feature_gate_denied",
      severity: "warning",
      entityType: "balance_movement",
      message: "Direct label payment blocked by account feature gate.",
      metadata: {
        userId,
        reason: directPaymentGate.reason,
        feature: "direct_label_payment",
      },
    });
    const message =
      directPaymentGate.reason === "feature_disabled"
        ? "Direct label payment is not enabled yet."
        : "Direct label payment is not available for this account yet.";
    return apiError(message, directPaymentGate.httpStatus);
  }

  try {
    await assertLabelCheckoutRateLimit({
      userId,
      email: userEmail,
      request,
      supabase: createServiceSupabaseClient(),
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      await createAuditLog({
        userId,
        eventType: "label_checkout_rate_limited",
        severity: "warning",
        entityType: "balance_movement",
        message: "Label checkout attempt blocked by rate limit.",
        metadata: { userId },
      });
      return apiError(error.message, error.httpStatus);
    }
    throw error;
  }

  let body: LabelCheckoutBody;
  try {
    body = (await request.json()) as LabelCheckoutBody;
  } catch {
    return apiError("Invalid request body.", 400);
  }

  if (typeof body.provider !== "string" || !body.provider.trim()) {
    return apiError("provider is required.", 400);
  }
  if (!isValidRateSnapshot(body.rateSnapshot)) {
    return apiError("Invalid rate snapshot — provider, serviceCode, carrierCode, providerCost, customerPrice, and currency are required.", 400);
  }
  if (!isValidAddress(body.origin)) {
    return apiError("Incomplete origin address — street1, city, state, and postalCode are required.", 400);
  }
  if (!isValidAddress(body.destination)) {
    return apiError("Incomplete destination address — street1, city, state, and postalCode are required.", 400);
  }
  if (!isValidParcel(body.parcel)) {
    return apiError("Invalid parcel — weight, weightUnit, length, width, height, and dimensionUnit are required.", 400);
  }

  // Server-side amount calculation — always re-derive from providerCost in the snapshot.
  // This ensures current markup/fee rules are applied, even if the client-side rate cache is stale.
  const recomputedPricing = calculateCustomerPrice(body.rateSnapshot.providerCost);
  const amountCents = Math.round(recomputedPricing.customerPrice * 100);
  if (amountCents < 50) {
    // Stripe minimum is 50 cents for USD.
    return apiError("Label price is too low to process.", 400);
  }

  // Log if the client's quoted price diverges significantly from the server-computed price.
  const clientCustomerPrice = body.rateSnapshot.customerPrice;
  if (Math.abs(recomputedPricing.customerPrice - clientCustomerPrice) > 1.00) {
    console.warn("[LabelCheckout] price mismatch — snapshot vs server recalculation", {
      userId,
      snapshotCustomerPrice: clientCustomerPrice,
      serverCustomerPrice: recomputedPricing.customerPrice,
      providerCost: body.rateSnapshot.providerCost,
    });
  }

  // Enrich snapshot with server-computed pricing breakdown for storage and audit.
  const enrichedRateSnapshot: PendingLabelOrderRateSnapshot = {
    ...body.rateSnapshot,
    customerPrice: recomputedPricing.customerPrice,
    pricingBreakdown: recomputedPricing as unknown as Record<string, unknown>,
  };

  const serviceCode = body.serviceCode ?? body.rateSnapshot.serviceCode;
  const serviceName = body.serviceName;

  try {
    // 1. Create pending_label_order row first — Stripe checkout is only created if DB succeeds.
    // If the migration hasn't been applied yet, detect the missing table and return 503 clearly.
    const order = await createPendingLabelOrder({
      userId,
      provider: body.provider.trim(),
      serviceCode,
      serviceName,
      amountCents,
      currency: "usd",
      rateSnapshot: enrichedRateSnapshot,
      origin: body.origin,
      destination: body.destination,
      parcel: body.parcel,
      idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
    });

    // 2. Create Stripe Checkout Session.
    const session = await getStripeClient().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Shipping label — ${serviceCode}`,
              description: serviceName
                ? `${body.provider} · ${serviceName}`
                : body.provider,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        purpose: "label_direct_payment",
        pending_label_order_id: order.id,
        user_id: userId,
      },
      success_url: `${appUrl}/crear-guia?labelPayment=success&order_id=${order.id}`,
      cancel_url: `${appUrl}/crear-guia?labelPayment=cancelled&order_id=${order.id}`,
      // 30 minutes matches order expires_at. Stripe minimum is 30 min, maximum is 24 h.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    // 3. Persist the Stripe session ID on the order.
    await updatePendingLabelOrderCheckoutSession(order.id, session.id);

    await createAuditLog({
      userId,
      eventType: "label_checkout_created",
      severity: "info",
      entityType: "balance_movement",
      entityId: order.id,
      provider: body.provider.trim(),
      idempotencyKey: order.idempotencyKey ?? null,
      message: "Direct label payment Stripe Checkout Session created.",
      metadata: {
        orderId: order.id,
        stripeCheckoutSessionId: session.id,
        amountCents,
        provider: body.provider.trim(),
      },
    });

    return apiSuccess({
      checkoutUrl: session.url,
      pendingLabelOrderId: order.id,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error ?? "");
    const isMissingTable =
      msg.includes("42P01") ||
      msg.includes("PGRST205") ||
      msg.toLowerCase().includes("pending_label_orders");
    if (isMissingTable) {
      return apiError(
        "Pending label orders table is not available yet. Apply the migration first.",
        503,
      );
    }
    console.error("[LabelCheckoutFailed]", { userId, message: msg });
    return apiError("Could not create label checkout session.", 500);
  }
}
