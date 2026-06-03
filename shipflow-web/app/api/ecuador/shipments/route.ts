import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import {
  createEcuadorShipmentRequest,
  isKnownEcuadorRequestErrorMessage,
  listUserEcuadorShipmentRequests,
  normalizeCreateEcuadorShipmentRequestInput,
} from "@/lib/server/regionalShipments";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

function parseLimit(value: string | null) {
  const limit = Number(value ?? 50);
  if (!Number.isFinite(limit)) return 50;
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

async function toEcuadorApiError(error: unknown, fallbackMessage: string) {
  if (error instanceof Response) {
    return apiError((await error.text()) || fallbackMessage, error.status);
  }

  if (error instanceof Error && isKnownEcuadorRequestErrorMessage(error.message)) {
    return apiError(error.message, 400);
  }

  return apiError(fallbackMessage, 500);
}

export async function GET(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    const { supabase, user } = await requireVerifiedUser(request);
    const url = new URL(request.url);
    const status = url.searchParams.get("status")?.trim();
    const limit = parseLimit(url.searchParams.get("limit"));
    const shipments = await listUserEcuadorShipmentRequests(supabase, user.id, { status, limit });
    return apiSuccess({ shipments, limit });
  } catch (error) {
    return toEcuadorApiError(error, "We could not load Ecuador Shipping requests.");
  }
}

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    const { supabase, user } = await requireVerifiedUser(request);
    const input = normalizeCreateEcuadorShipmentRequestInput(await request.json());
    const shipment = await createEcuadorShipmentRequest(supabase, user.id, input);
    return apiSuccess({
      shipment,
      message: "Ecuador Shipping request created for beta review.",
    }, 201);
  } catch (error) {
    return toEcuadorApiError(error, "We could not create this Ecuador Shipping request.");
  }
}
