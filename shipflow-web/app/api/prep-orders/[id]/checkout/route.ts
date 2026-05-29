import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import {
  createServiceSupabaseClient,
  isServerSupabaseConfigured,
  isServiceRoleConfigured,
  requireVerifiedUser,
} from "@/lib/server/supabaseServer";
import { getStripeClient, isStripeConfigured, isStripeWebhookConfigured } from "@/lib/server/stripe";
import { canPayPrepOrder } from "@/lib/prep";
import { loadPrepOrderDetails, type PrepOrderRow } from "@/lib/server/prepOrders";

export const runtime = "nodejs";

function appUrlFromRequest(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Prep payment is not configured correctly.", 503);
  }

  if (!isStripeConfigured || !isStripeWebhookConfigured) {
    return apiError("Card payment is not available for Prep yet.", 503);
  }

  try {
    const { user } = await requireVerifiedUser(request);
    const { id } = await params;
    const serviceSupabase = createServiceSupabaseClient();
    const { data: order, error } = await serviceSupabase
      .from("prep_orders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle<PrepOrderRow>();
    if (error) throw error;
    if (!order) return apiError("Prep order not found.", 404);

    const finalTotalCents = order.final_total ?? 0;
    if (!canPayPrepOrder({ status: order.status, finalTotal: finalTotalCents / 100, paymentStatus: order.payment_status as never })) {
      return apiError("This Prep quote is not payable right now.", 400);
    }

    const appUrl = appUrlFromRequest(request);
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email ?? order.contact_email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: finalTotalCents,
            product_data: {
              name: `SendiFlash Prep quote ${order.id.slice(0, 8)}`,
              description: order.product_summary,
            },
          },
        },
      ],
      success_url: `${appUrl}/prep/orders/${order.id}?payment=success`,
      cancel_url: `${appUrl}/prep/orders/${order.id}?payment=cancelled`,
      metadata: {
        type: "prep_order",
        purpose: "prep_order",
        prep_order_id: order.id,
        user_id: user.id,
      },
      payment_intent_data: {
        metadata: {
          type: "prep_order",
          purpose: "prep_order",
          prep_order_id: order.id,
          user_id: user.id,
        },
      },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await serviceSupabase
      .from("prep_orders")
      .update({
        payment_status: "pending",
        payment_method: "card",
        stripe_checkout_session_id: session.id,
        quote_accepted_at: order.quote_accepted_at ?? now,
      })
      .eq("id", order.id)
      .eq("user_id", user.id)
      .in("payment_status", ["unpaid", "failed"])
      .select("*")
      .maybeSingle<PrepOrderRow>();
    if (updateError) throw updateError;
    if (!updated) return apiError("This Prep order was already paid or changed state. Refresh and try again.", 409);

    return apiSuccess({
      checkoutUrl: session.url,
      order: await loadPrepOrderDetails(serviceSupabase, updated, false),
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not start Prep card checkout.");
  }
}
