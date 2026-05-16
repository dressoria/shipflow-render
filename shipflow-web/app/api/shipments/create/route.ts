import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { createInternalShipment, type CreateInternalShipmentInput } from "@/lib/server/shipments/createInternalShipment";
import { isServerSupabaseConfigured, requireSupabaseUser } from "@/lib/server/supabaseServer";

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("El servidor no está configurado correctamente.", 503);
  }

  try {
    const { supabase, user } = await requireSupabaseUser(request);
    const body = (await request.json()) as CreateInternalShipmentInput;
    const result = await createInternalShipment(supabase, user.id, body);

    return apiSuccess(result.shipment);
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not create this label.");
  }
}
