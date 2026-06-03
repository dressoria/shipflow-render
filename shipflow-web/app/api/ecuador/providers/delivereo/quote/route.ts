import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import { getDelivereoCredentialStatus } from "@/lib/server/delivereoConfig";
import { getDelivereoQuoteForEcuador, toSafeDelivereoQuoteError } from "@/lib/server/ecuadorQuotes";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  const credentials = getDelivereoCredentialStatus();
  if (!credentials.enabled) {
    return apiError("Delivereo beta quote is disabled right now.", 503);
  }

  if (!credentials.credentialsPresent) {
    return apiError("Delivereo beta quote is not configured yet.", 503);
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
    return apiError(await safeError.text(), safeError.status);
  }
}
