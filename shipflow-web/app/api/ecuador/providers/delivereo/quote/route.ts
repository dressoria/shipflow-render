import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import { getDelivereoCredentialStatus } from "@/lib/server/delivereoConfig";
import { getDelivereoQuoteForEcuador, toSafeDelivereoQuoteError } from "@/lib/server/ecuadorQuotes";
import { delivereoErrorResponse } from "@/lib/server/delivereoHttp";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  const credentials = getDelivereoCredentialStatus();
  if (!credentials.enabled) {
    return apiError("Delivereo is not configured", 503, "DELIVEREO_ENABLED is false");
  }

  if (!credentials.credentialsPresent) {
    return apiError(
      "Delivereo is not configured",
      503,
      credentials.missingFields.length > 0 ? `Missing ${credentials.missingFields[0]}` : "Missing Delivereo credentials",
    );
  }

  try {
    await requireVerifiedUser(request);
    const body = await request.json();
    const quote = await getDelivereoQuoteForEcuador(body);
    return apiSuccess({
      quote,
      beta: true,
      message: "Cotización beta calculada. No genera orden ni cobro.",
    });
  } catch (error) {
    const safeError = toSafeDelivereoQuoteError(error);
    const payload = await safeError.json().catch(() => null);
    return delivereoErrorResponse(
      payload && typeof payload === "object"
        ? {
            ...(payload as Record<string, unknown>),
          }
        : error,
    );
  }
}
