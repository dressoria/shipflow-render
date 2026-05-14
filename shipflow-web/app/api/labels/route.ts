import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { createInternalShipment, type CreateInternalShipmentInput } from "@/lib/server/shipments/createInternalShipment";
import {
  createShipStationShipment,
  type ShipStationLabelBody,
} from "@/lib/server/shipments/createShipStationShipment";
import { isServerSupabaseConfigured, requireSupabaseUser } from "@/lib/server/supabaseServer";

function isShipStationLabelRequest(body: unknown): body is ShipStationLabelBody {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as Record<string, unknown>).provider === "shipstation"
  );
}

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Supabase is not configured on the server.", 503);
  }

  try {
    const { supabase, user } = await requireSupabaseUser(request);
    const body = (await request.json()) as unknown;

    if (isShipStationLabelRequest(body)) {
      const result = await createShipStationShipment(supabase, user.id, body);
      return apiSuccess(result, 201);
    }

    // Default: internal/mock label creation
    const result = await createInternalShipment(supabase, user.id, body as CreateInternalShipmentInput);
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not create this label.");
  }
}
