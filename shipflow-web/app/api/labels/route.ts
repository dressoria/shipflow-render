import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { createInternalShipment, type CreateInternalShipmentInput } from "@/lib/server/shipments/createInternalShipment";
import { isServerSupabaseConfigured, requireSupabaseUser } from "@/lib/server/supabaseServer";

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Supabase is not configured on the server.", 503);
  }

  try {
    const { supabase, user } = await requireSupabaseUser(request);
    const body = (await request.json()) as CreateInternalShipmentInput;
    const result = await createInternalShipment(supabase, user.id, body);

    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not create this internal label.");
  }
}
