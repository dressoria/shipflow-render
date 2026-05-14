import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import {
  fromShipmentRow,
  fromTrackingEventRow,
  type ShipmentRow,
  type TrackingEventRow,
} from "@/lib/server/shipments/createInternalShipment";
import { isServerSupabaseConfigured, requireSupabaseUser } from "@/lib/server/supabaseServer";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isServerSupabaseConfigured) {
    return apiError("Supabase is not configured on the server.", 503);
  }

  try {
    const { id } = await context.params;
    const shipmentId = decodeURIComponent(id ?? "").trim();
    if (!shipmentId) return apiError("Shipment id is required.", 400);

    const { supabase, user } = await requireSupabaseUser(request);
    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", shipmentId)
      .eq("user_id", user.id)
      .maybeSingle<ShipmentRow>();

    if (shipmentError) throw shipmentError;
    if (!shipment) return apiError("Shipment not found.", 404);

    const { data: trackingEvents, error: trackingError } = await supabase
      .from("tracking_events")
      .select("*")
      .eq("shipment_id", shipment.id)
      .order("created_at", { ascending: true })
      .returns<TrackingEventRow[]>();

    if (trackingError) throw trackingError;

    return apiSuccess({
      shipment: fromShipmentRow(shipment),
      trackingEvents: (trackingEvents ?? []).map(fromTrackingEventRow),
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load this shipment.");
  }
}
