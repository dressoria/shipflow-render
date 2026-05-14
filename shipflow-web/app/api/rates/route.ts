import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { calculateInternalRates, type RateRequestInput } from "@/lib/server/shipments/createInternalShipment";
import { isServerSupabaseConfigured, requireSupabaseUser } from "@/lib/server/supabaseServer";

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Supabase is not configured on the server.", 503);
  }

  try {
    const { supabase } = await requireSupabaseUser(request);
    const body = (await request.json()) as RateRequestInput;
    const rates = await calculateInternalRates(supabase, body);

    return apiSuccess({
      provider: "internal",
      rates,
      message: "Internal ShipFlow rates. No external provider was contacted.",
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not calculate rates.");
  }
}
