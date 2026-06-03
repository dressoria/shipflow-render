import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { listAdminEcuadorShipmentRequests } from "@/lib/server/regionalShipments";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";

function parseLimit(value: string | null) {
  const limit = Number(value ?? 50);
  if (!Number.isFinite(limit)) return 50;
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

export async function GET(request: Request) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin Ecuador Shipping is not configured correctly.", 503);
  }

  try {
    const { serviceSupabase } = await requireAdminUser(request);
    const url = new URL(request.url);
    const status = url.searchParams.get("status")?.trim();
    const search = url.searchParams.get("search")?.trim();
    const limit = parseLimit(url.searchParams.get("limit"));
    const shipments = await listAdminEcuadorShipmentRequests(serviceSupabase, { status, search, limit });
    return apiSuccess({ shipments, limit });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load admin Ecuador Shipping requests.");
  }
}
