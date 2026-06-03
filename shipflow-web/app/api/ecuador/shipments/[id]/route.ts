import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import { getUserEcuadorShipmentRequest, isKnownEcuadorRequestErrorMessage } from "@/lib/server/regionalShipments";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

async function toEcuadorApiError(error: unknown, fallbackMessage: string) {
  if (error instanceof Response) {
    return apiError((await error.text()) || fallbackMessage, error.status);
  }

  if (error instanceof Error && isKnownEcuadorRequestErrorMessage(error.message)) {
    return apiError(error.message, 400);
  }

  return apiError(fallbackMessage, 500);
}

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
    return toEcuadorApiError(error, "We could not load this Ecuador Shipping request.");
  }
}
