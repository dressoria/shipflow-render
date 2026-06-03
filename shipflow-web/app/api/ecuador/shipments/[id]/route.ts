import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { getUserEcuadorShipmentRequest } from "@/lib/server/regionalShipments";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    const { supabase, user } = await requireVerifiedUser(request);
    const { id } = await params;
    const shipment = await getUserEcuadorShipmentRequest(supabase, user.id, id);
    if (!shipment) return apiError("Ecuador Shipping request not found.", 404);
    return apiSuccess({ shipment });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load this Ecuador Shipping request.");
  }
}
