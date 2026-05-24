// FASE 5.40C — Authenticated feature availability endpoint.
//
// GET /api/config/features
//
// Returns feature gate results for the authenticated user.
// Requires a verified user session (Bearer token).
//
// Response fields are plain booleans — never exposes allowlist emails or user IDs.
// Use this to drive conditional UI (e.g., disable "Pay by card" for non-allowlisted users).

import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";
import {
  canUseDirectLabelPayment,
  canPurchaseRealLabel,
  canVoidRealLabel,
  canRefundLabelPayment,
} from "@/lib/server/featureGates";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  let userEmail: string | null = null;
  let userId: string | null = null;

  try {
    const { user } = await requireVerifiedUser(request);
    userEmail = user.email ?? null;
    userId = user.id;
  } catch (error) {
    if (error instanceof Response) {
      return apiError((await error.text()) || "Unauthorized.", error.status);
    }
    return apiError("Authentication failed.", 401);
  }

  const userRef = { email: userEmail, id: userId };

  const directLabelPayment = canUseDirectLabelPayment(userRef);
  const realLabelPurchase = canPurchaseRealLabel(userRef);
  const realVoid = canVoidRealLabel(userRef);
  const labelPaymentRefund = canRefundLabelPayment(userRef);

  return apiSuccess({
    directLabelPaymentAvailable: directLabelPayment.allowed,
    realLabelPurchaseAvailable: realLabelPurchase.allowed,
    realVoidAvailable: realVoid.allowed,
    labelPaymentRefundAvailable: labelPaymentRefund.allowed,
  });
}
