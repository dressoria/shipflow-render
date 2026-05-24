import { apiError } from "@/lib/server/apiResponse";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

// FASE 5.39 — Label direct payment stub.
// This endpoint is intentionally disabled until the go/no-go checklist in
// docs/ROADMAP.md FASE 5.39 is complete and ENABLE_REAL_LABEL_PURCHASE=true.
//
// When enabled, this route will:
//   1. Validate auth + email verification
//   2. Parse and validate the rate snapshot from the request body
//   3. Insert a pending_label_orders row (service_role)
//   4. Create a Stripe Checkout Session for customer_price
//   5. Store stripe_checkout_session_id on the order
//   6. Return { checkoutUrl } to the client
//
// The actual label purchase happens in the Stripe webhook handler
// (app/api/webhooks/stripe/route.ts) AFTER checkout.session.completed fires,
// and only when ENABLE_REAL_LABEL_PURCHASE=true.

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  // Guard: feature not yet enabled.
  if (process.env.ENABLE_REAL_LABEL_PURCHASE !== "true") {
    return apiError(
      "Label direct payment is not enabled yet. This feature is coming soon.",
      503,
    );
  }

  try {
    // Auth guard — must be verified to attempt label purchase.
    await requireVerifiedUser(request);

    // TODO FASE 5.39: parse body, validate rate snapshot, check expiry
    // TODO FASE 5.39: insert pending_label_orders row via service_role
    // TODO FASE 5.39: create Stripe Checkout Session with purpose=label_direct_payment
    // TODO FASE 5.39: return { checkoutUrl }

    return apiError("Label direct payment is not implemented yet.", 501);
  } catch (error) {
    if (error instanceof Response) {
      return apiError((await error.text()) || "Request failed.", error.status);
    }
    return apiError("An unexpected error occurred.", 500);
  }
}
