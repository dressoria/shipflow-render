import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import {
  loadProfiles,
  mapAdminShipment,
  parseAdminLimit,
} from "@/lib/server/adminSupport";
import type { ShipmentRow } from "@/lib/server/shipments/createInternalShipment";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";

export async function GET(request: Request) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin support is not configured correctly.", 503);
  }

  try {
    const { serviceSupabase } = await requireAdminUser(request);
    const url = new URL(request.url);
    const limit = parseAdminLimit(url.searchParams.get("limit"));
    const trackingNumber = url.searchParams.get("trackingNumber")?.trim();
    const labelStatus = url.searchParams.get("labelStatus")?.trim();
    const paymentStatus = url.searchParams.get("paymentStatus")?.trim();
    const email = url.searchParams.get("email")?.trim().toLowerCase();
    const { byId: profilesById, profiles } = await loadProfiles(serviceSupabase);

    let query = serviceSupabase
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (trackingNumber) query = query.ilike("tracking_number", `%${trackingNumber}%`);
    if (labelStatus) query = query.eq("label_status", labelStatus);
    if (paymentStatus) query = query.eq("payment_status", paymentStatus);
    if (email) {
      const userIds = profiles
        .filter((profile) => profile.email.toLowerCase().includes(email))
        .map((profile) => profile.id);

      if (userIds.length === 0) {
        return apiSuccess({ shipments: [], limit });
      }
      query = query.in("user_id", userIds);
    }

    const { data, error } = await query.returns<ShipmentRow[]>();
    if (error) throw error;

    return apiSuccess({
      shipments: (data ?? []).map((shipment) => mapAdminShipment(shipment, profilesById)),
      limit,
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load admin shipments.");
  }
}
