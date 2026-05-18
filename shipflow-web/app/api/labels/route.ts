import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { createShipEngineShipment, type ShipEngineLabelBody } from "@/lib/server/shipments/createShipEngineShipment";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

// Providers with skeleton adapters — label creation not yet implemented.
const SKELETON_LABEL_PROVIDERS = ["shippo", "easypost", "easyship"] as const;

function isShipEngineLabelRequest(body: unknown): body is ShipEngineLabelBody {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as Record<string, unknown>).provider === "shipstation"
  );
}

function extractProvider(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null) {
    const p = (body as Record<string, unknown>).provider;
    return typeof p === "string" ? p : undefined;
  }
  return undefined;
}

function isShipEngineMode() {
  return process.env.SHIPSTATION_API_MODE?.trim().toLowerCase() === "shipengine";
}

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  if (process.env.ENABLE_REAL_LABEL_PURCHASE !== "true") {
    return apiError("Label purchase is currently disabled. Rate comparison is available.", 403);
  }

  try {
    const { supabase, user } = await requireVerifiedUser(request);
    const body = (await request.json()) as unknown;

    const provider = extractProvider(body);

    // Reject skeleton providers explicitly — no silent fallback to ShipStation.
    if (provider && SKELETON_LABEL_PROVIDERS.includes(provider as typeof SKELETON_LABEL_PROVIDERS[number])) {
      return apiError(
        "Label generation for this rate is not available yet.",
        501,
      );
    }

    if (isShipEngineLabelRequest(body)) {
      if (isShipEngineMode()) {
        const result = await createShipEngineShipment(supabase, user.id, body);
        return apiSuccess({
          shipmentId: result.shipmentId,
          trackingNumber: result.trackingNumber,
          labelUrl: result.labelUrl,
          carrier: result.carrier,
          service: result.service,
          total: result.total,
          currency: result.currency,
          shipment: result.shipment,
          labelStatus: result.labelStatus,
          labelData: null,
          providerShipmentId: result.providerShipmentId,
          providerLabelId: result.providerLabelId,
          providerServiceCode: result.providerServiceCode,
          customerPrice: result.customerPrice,
          message: result.message,
        }, 201);
      }

      return apiError("ShipStation legacy label purchase is not enabled in this phase.", 501);
    }

    return apiError("Only ShipEngine label purchase is supported in this phase.", 400);
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not create this label.");
  }
}
