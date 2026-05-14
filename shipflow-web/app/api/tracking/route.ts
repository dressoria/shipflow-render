import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { readBearerToken, requireSupabaseUser } from "@/lib/server/supabaseServer";
import { getRealTracking } from "@/lib/services/realTrackingService";

type TrackingRequest = {
  trackingNumber?: string;
  courier?: string;
};

const allowedCouriers = ["usps", "ups", "fedex", "dhl"];

function normalizeCourier(value: string) {
  const normalized = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("usps") || normalized.includes("postal")) return "usps";
  if (normalized.includes("ups")) return "ups";
  if (normalized.includes("fedex") || normalized.includes("federal express")) return "fedex";
  if (normalized.includes("dhl")) return "dhl";
  return "unknown";
}

export async function POST(request: Request) {
  try {
    if (readBearerToken(request)) {
      await requireSupabaseUser(request);
    }

    const body = (await request.json()) as TrackingRequest;
    const trackingNumber = body.trackingNumber?.trim();
    const courier = body.courier?.trim();

    if (!trackingNumber || !courier) {
      return apiError("Enter a tracking number and carrier to check shipment status.", 400);
    }

    if (!allowedCouriers.includes(normalizeCourier(courier))) {
      return apiError("Unsupported carrier for live tracking.", 400);
    }

    const data = await getRealTracking(trackingNumber, courier);

    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(
      error,
      error instanceof Error
        ? `We could not check this carrier right now: ${error.message}`
        : "We could not check this carrier right now.",
      502,
    );
  }
}
