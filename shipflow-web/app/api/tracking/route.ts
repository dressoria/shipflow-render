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
      return apiError("Ingresa número de tracking y transportista para consultar el estado.", 400);
    }

    if (!allowedCouriers.includes(normalizeCourier(courier))) {
      return apiError("Este transportista todavía no está disponible para tracking.", 400);
    }

    const data = await getRealTracking(trackingNumber, courier);

    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(
      error,
      error instanceof Error
        ? `No pudimos consultar el estado en este momento: ${error.message}`
        : "No pudimos consultar el estado en este momento.",
      502,
    );
  }
}
