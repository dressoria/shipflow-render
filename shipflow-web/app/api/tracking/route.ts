import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import {
  fromShipmentRow,
  fromTrackingEventRow,
  type ShipmentRow,
  type TrackingEventRow,
} from "@/lib/server/shipments/createInternalShipment";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

type TrackingRequest = {
  trackingNumber?: string;
  shipmentId?: string;
  id?: string;
};

function normalizeSearchParams(request: Request): TrackingRequest {
  const url = new URL(request.url);
  return {
    trackingNumber: url.searchParams.get("trackingNumber") ?? url.searchParams.get("tracking_number") ?? undefined,
    shipmentId: url.searchParams.get("shipmentId") ?? url.searchParams.get("shipment_id") ?? url.searchParams.get("id") ?? undefined,
  };
}

async function parsePostBody(request: Request): Promise<TrackingRequest> {
  try {
    return (await request.json()) as TrackingRequest;
  } catch {
    return {};
  }
}

async function getBasicTracking(request: Request, input: TrackingRequest) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  const trackingNumber = input.trackingNumber?.trim();
  const shipmentId = (input.shipmentId ?? input.id)?.trim();

  if (!trackingNumber && !shipmentId) {
    return apiError("Enter a tracking number to view shipment details.", 400);
  }

  const { supabase, user } = await requireVerifiedUser(request);

  let shipmentQuery = supabase
    .from("shipments")
    .select("*")
    .eq("user_id", user.id)
    .limit(1);

  if (trackingNumber) {
    shipmentQuery = shipmentQuery.eq("tracking_number", trackingNumber);
  } else {
    shipmentQuery = shipmentQuery.eq("id", shipmentId);
  }

  const { data: shipments, error: shipmentError } = await shipmentQuery.returns<ShipmentRow[]>();
  if (shipmentError) throw shipmentError;

  const shipment = shipments?.[0];
  if (!shipment) {
    return apiError("Tracking number not found.", 404);
  }

  const { data: trackingEvents, error: trackingError } = await supabase
    .from("tracking_events")
    .select("*")
    .eq("shipment_id", shipment.id)
    .order("created_at", { ascending: true })
    .returns<TrackingEventRow[]>();

  if (trackingError) throw trackingError;

  const events = (trackingEvents ?? []).map(fromTrackingEventRow);
  const mappedShipment = fromShipmentRow(shipment);

  return apiSuccess({
    shipment: mappedShipment,
    shipmentId: shipment.id,
    trackingNumber: shipment.tracking_number,
    shipmentStatus: mappedShipment.status,
    labelStatus: mappedShipment.labelStatus,
    paymentStatus: mappedShipment.paymentStatus,
    carrier: mappedShipment.courier,
    service: mappedShipment.providerServiceCode,
    recipientName: mappedShipment.recipientName,
    destinationCity: mappedShipment.destinationCity,
    destinationAddress: mappedShipment.destinationAddress,
    createdAt: mappedShipment.date,
    labelUrl: mappedShipment.labelUrl,
    events,
    message: events.length
      ? "Tracking events loaded from ShipFlow."
      : "No tracking events yet. Tracking updates will appear once the carrier reports movement.",
  });
}

export async function GET(request: Request) {
  try {
    return await getBasicTracking(request, normalizeSearchParams(request));
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load tracking details right now. Please try again.");
  }
}

export async function POST(request: Request) {
  try {
    return await getBasicTracking(request, await parsePostBody(request));
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load tracking details right now. Please try again.");
  }
}
