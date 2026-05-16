import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { createInternalShipment, type CreateInternalShipmentInput } from "@/lib/server/shipments/createInternalShipment";
import {
  createShipStationShipment,
  type ShipStationLabelBody,
} from "@/lib/server/shipments/createShipStationShipment";
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

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Supabase is not configured on the server.", 503);
  }

  try {
    const { supabase, user } = await requireVerifiedUser(request);
    const body = (await request.json()) as unknown;

    const provider = extractProvider(body);

    // Reject skeleton providers explicitly — no silent fallback to ShipStation.
    if (provider && SKELETON_LABEL_PROVIDERS.includes(provider as typeof SKELETON_LABEL_PROVIDERS[number])) {
      return apiError(
        "La generación de guía para esta tarifa todavía no está disponible.",
        501,
      );
    }

    if (isShipStationLabelRequest(body)) {
      const result = await createShipStationShipment(supabase, user.id, body);
      return apiSuccess(result, 201);
    }

    // Default: internal/mock label creation
    const result = await createInternalShipment(supabase, user.id, body as CreateInternalShipmentInput);
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFromUnknown(error, "No se pudo generar esta guía.");
  }
}
