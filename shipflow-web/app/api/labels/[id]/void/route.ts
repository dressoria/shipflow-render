import { apiError, apiErrorFromUnknown, apiSuccess, isMissingSchemaColumnError } from "@/lib/server/apiResponse";
import { fromShipmentRow, type ShipmentRow } from "@/lib/server/shipments/createInternalShipment";
import { isServerSupabaseConfigured, requireSupabaseUser } from "@/lib/server/supabaseServer";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isServerSupabaseConfigured) {
    return apiError("Supabase is not configured on the server.", 503);
  }

  try {
    const { id } = await context.params;
    const shipmentId = decodeURIComponent(id ?? "").trim();
    if (!shipmentId) return apiError("Shipment id is required.", 400);

    const { supabase, user } = await requireSupabaseUser(request);
    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", shipmentId)
      .eq("user_id", user.id)
      .maybeSingle<ShipmentRow>();

    if (shipmentError) throw shipmentError;
    if (!shipment) return apiError("Shipment not found.", 404);

    if (shipment.label_status && shipment.label_status !== "internal") {
      return apiError("Only internal labels can be voided in this phase.", 409);
    }

    const { data: updatedShipment, error: updateError } = await supabase
      .from("shipments")
      .update({ label_status: "voided" })
      .eq("id", shipment.id)
      .eq("user_id", user.id)
      .select()
      .single<ShipmentRow>();

    if (updateError && isMissingSchemaColumnError(updateError)) {
      return apiError("Voiding labels requires the FASE 1C migration to be applied first.", 501);
    }

    if (updateError) throw updateError;

    return apiSuccess({
      shipment: updatedShipment ? fromShipmentRow(updatedShipment) : fromShipmentRow(shipment),
      labelStatus: "voided",
      refunded: false,
      message: "Internal label marked as voided. No carrier void or refund was performed.",
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not void this label.");
  }
}
