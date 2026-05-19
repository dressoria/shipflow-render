import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import {
  calculateAdminTotals,
  loadProfiles,
  mapAdminMovement,
  mapAdminShipment,
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
    const { byId: profilesById, users } = await loadProfiles(serviceSupabase);

    const { data: shipments, error: shipmentsError } = await serviceSupabase
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<ShipmentRow[]>();

    if (shipmentsError) throw shipmentsError;

    const { data: movements, error: movementsError } = await serviceSupabase
      .from("balance_movements")
      .select("id,user_id,concept,amount,type,reference_type,reference_id,shipment_id,idempotency_key,metadata,created_by,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<BalanceMovementRow[]>();

    if (movementsError) throw movementsError;

    const shipmentRows = shipments ?? [];
    const movementRows = movements ?? [];
    const shipmentsById = new Map(shipmentRows.map((shipment) => [shipment.id, shipment]));
    const totals = calculateAdminTotals(shipmentRows, movementRows);

    return apiSuccess({
      users,
      shipments: shipmentRows.map((shipment) => mapAdminShipment(shipment, profilesById)),
      movements: movementRows.map((movement) => mapAdminMovement(movement, profilesById, shipmentsById)),
      totals: {
        ...totals,
        totalUsers: users.length,
      },
      reconciliation: {
        pendingCount: 0,
        notes: [
          "Reconciliation queue is not implemented yet.",
          "Use support logs for carrier label purchased but DB save failed, void approved but refund failed, missing label URL, or ambiguous idempotency states.",
        ],
      },
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load admin overview.");
  }
}
