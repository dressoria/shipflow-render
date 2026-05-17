import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { createInternalShipment, type CreateInternalShipmentInput } from "@/lib/server/shipments/createInternalShipment";
import {
  createShipStationShipment,
  type ShipStationLabelBody,
} from "@/lib/server/shipments/createShipStationShipment";
import { assertShipEngineLabelPurchaseNotImplemented } from "@/lib/logistics/adapters/ShipEngineLabelAdapter";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

// Providers with skeleton adapters — label creation not yet implemented.
const SKELETON_LABEL_PROVIDERS = ["shippo", "easypost", "easyship"] as const;

function isShipStationLabelRequest(body: unknown): body is ShipStationLabelBody {
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

    if (isShipStationLabelRequest(body)) {
      if (isShipEngineMode()) {
        assertShipEngineLabelPurchaseNotImplemented();
      }
      const result = await createShipStationShipment(supabase, user.id, body);
      return apiSuccess(result, 201);
    }

    // Default: internal label creation. This path is still guarded by ENABLE_REAL_LABEL_PURCHASE.
    const result = await createInternalShipment(supabase, user.id, body as CreateInternalShipmentInput);
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not create this label.");
  }
}
