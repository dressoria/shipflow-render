import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { fromShipmentRow, type ShipmentRow } from "@/lib/server/shipments/createInternalShipment";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

function parseLimit(value: string | null) {
  const limit = Number(value ?? 50);
  if (!Number.isFinite(limit)) return 50;
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

export async function GET(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Supabase is not configured on the server.", 503);
  }

  try {
    const { supabase, user } = await requireVerifiedUser(request);
    const url = new URL(request.url);
    const status = url.searchParams.get("status")?.trim();
    const trackingNumber = url.searchParams.get("tracking_number")?.trim();
    const limit = parseLimit(url.searchParams.get("limit"));

    let query = supabase
      .from("shipments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (trackingNumber) query = query.ilike("tracking_number", `%${trackingNumber}%`);

    const { data, error } = await query.returns<ShipmentRow[]>();
    if (error) throw error;

    return apiSuccess({
      shipments: (data ?? []).map(fromShipmentRow),
      limit,
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load shipments.");
  }
}
