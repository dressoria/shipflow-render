import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import {
  loadProfiles,
  mapAdminMovement,
  parseAdminLimit,
  type BalanceMovementRow,
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
    const type = url.searchParams.get("type")?.trim();
    const email = url.searchParams.get("email")?.trim().toLowerCase();
    const trackingNumber = url.searchParams.get("trackingNumber")?.trim();
    const { byId: profilesById, profiles } = await loadProfiles(serviceSupabase);

    let shipmentRows: ShipmentRow[] = [];
    let shipmentIdsForFilter: string[] | null = null;

    if (trackingNumber) {
      const { data: matchedShipments, error: matchedShipmentsError } = await serviceSupabase
        .from("shipments")
        .select("*")
        .ilike("tracking_number", `%${trackingNumber}%`)
        .limit(50)
        .returns<ShipmentRow[]>();

      if (matchedShipmentsError) throw matchedShipmentsError;
      shipmentRows = matchedShipments ?? [];
      shipmentIdsForFilter = shipmentRows.map((shipment) => shipment.id);

      if (shipmentIdsForFilter.length === 0) {
        return apiSuccess({ movements: [], limit });
      }
    }

    let query = serviceSupabase
      .from("balance_movements")
      .select("id,user_id,concept,amount,type,reference_type,reference_id,shipment_id,idempotency_key,metadata,created_by,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (type) query = query.eq("type", type);
    if (shipmentIdsForFilter) query = query.in("shipment_id", shipmentIdsForFilter);
    if (email) {
      const userIds = profiles
        .filter((profile) => profile.email.toLowerCase().includes(email))
        .map((profile) => profile.id);

      if (userIds.length === 0) {
        return apiSuccess({ movements: [], limit });
      }
      query = query.in("user_id", userIds);
    }

    const { data: movements, error } = await query.returns<BalanceMovementRow[]>();
    if (error) throw error;

    const shipmentIds = Array.from(
      new Set((movements ?? []).map((movement) => movement.shipment_id).filter(Boolean) as string[]),
    );

    if (!trackingNumber && shipmentIds.length > 0) {
      const { data: relatedShipments, error: relatedShipmentsError } = await serviceSupabase
        .from("shipments")
        .select("*")
        .in("id", shipmentIds)
        .returns<ShipmentRow[]>();

      if (relatedShipmentsError) throw relatedShipmentsError;
      shipmentRows = relatedShipments ?? [];
    }

    const shipmentsById = new Map(shipmentRows.map((shipment) => [shipment.id, shipment]));

    return apiSuccess({
      movements: (movements ?? []).map((movement) => mapAdminMovement(movement, profilesById, shipmentsById)),
      limit,
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load admin balance movements.");
  }
}
