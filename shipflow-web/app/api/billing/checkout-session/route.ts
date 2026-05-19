import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { createAuditLog } from "@/lib/server/auditLog";
import {
  createServiceSupabaseClient,
  isServerSupabaseConfigured,
  isServiceRoleConfigured,
  requireVerifiedUser,
} from "@/lib/server/supabaseServer";
import { getStripeClient, isStripeConfigured } from "@/lib/server/stripe";

export const runtime = "nodejs";

const ALLOWED_AMOUNTS = new Set([10, 25, 50, 100]);
const CURRENCY = "usd";

type CheckoutBody = {
  amount?: unknown;
};

type RechargeRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

function parseAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return null;
  return Number(amount.toFixed(2));
}

function appUrlFromRequest(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

async function auditPaymentEvent(
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

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Billing is not configured correctly.", 503);
  }

  if (!isStripeConfigured) {
    return apiError("Online recharge is not available yet.", 503);
  }

  try {
    const { user } = await requireVerifiedUser(request);
    const body = (await request.json().catch(() => null)) as CheckoutBody | null;
    if (!body) return apiError("Invalid request body.", 400);

    const amount = parseAmount(body.amount);
    if (amount == null || !ALLOWED_AMOUNTS.has(amount)) {
      await auditPaymentEvent("payment_checkout_failed", "warning", "Stripe checkout rejected because amount was invalid.", {
        userId: user.id,
        amount,
      });
      return apiError("Choose a valid recharge amount.", 400);
    }

    const serviceSupabase = createServiceSupabaseClient();
    const requestId = crypto.randomUUID();

    await createAuditLog({
      userId: user.id,
      eventType: "payment_checkout_started",
      severity: "info",
      entityType: "balance_movement",
      requestId,
      message: "Stripe recharge checkout started.",
      metadata: { amount, currency: CURRENCY },
    }, serviceSupabase);

    const { data: recharge, error: insertError } = await serviceSupabase
      .from("payment_recharges")
      .insert({
        user_id: user.id,
        amount,
        currency: CURRENCY,
        status: "pending",
        metadata: {
          source: "balance_panel",
          requestId,
          userEmail: user.email ?? null,
          environment: "test_beta",
        },
      })
      .select("id,amount,currency,status")
      .single<RechargeRow>();

    if (insertError || !recharge) {
      await createAuditLog({
        userId: user.id,
        eventType: "payment_checkout_failed",
        severity: "error",
        entityType: "balance_movement",
        requestId,
        message: "Stripe checkout could not create pending recharge record.",
        metadata: { amount, currency: CURRENCY, error: insertError?.message ?? "missing recharge row" },
      }, serviceSupabase);
      return apiError("Billing storage is not ready. Please contact support.", 503);
    }

    const appUrl = appUrlFromRequest(request);
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: "ShipFlow balance recharge",
            },
          },
        },
      ],
      success_url: `${appUrl}/saldo?recharge=success`,
      cancel_url: `${appUrl}/saldo?recharge=canceled`,
      metadata: {
        userId: user.id,
        rechargeId: recharge.id,
        amount: String(amount),
        currency: CURRENCY,
        environment: "test_beta",
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    const { error: updateError } = await serviceSupabase
      .from("payment_recharges")
      .update({
        stripe_checkout_session_id: session.id,
        metadata: {
          source: "balance_panel",
          requestId,
          userEmail: user.email ?? null,
          environment: "test_beta",
          stripeCheckoutSessionId: session.id,
        },
      })
      .eq("id", recharge.id);

    if (updateError) {
      await createAuditLog({
        userId: user.id,
        eventType: "payment_checkout_failed",
        severity: "critical",
        entityType: "balance_movement",
        entityId: recharge.id,
        requestId,
        message: "Stripe checkout was created but could not be saved.",
        metadata: { amount, currency: CURRENCY, stripeCheckoutSessionId: session.id, error: updateError.message },
      }, serviceSupabase);
      return apiError("Checkout was created but could not be saved. Please contact support.", 500);
    }

    await createAuditLog({
      userId: user.id,
      eventType: "payment_checkout_created",
      severity: "info",
      entityType: "balance_movement",
      entityId: recharge.id,
      requestId,
      message: "Stripe recharge checkout created.",
      metadata: { amount, currency: CURRENCY, stripeCheckoutSessionId: session.id },
    }, serviceSupabase);

    return apiSuccess({ checkoutUrl: session.url });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not start checkout.");
  }
}
