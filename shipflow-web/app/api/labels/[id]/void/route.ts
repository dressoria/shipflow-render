import {
  apiError,
  apiErrorFromUnknown,
  apiSuccess,
  isMissingSchemaColumnError,
  isRpcNotFoundError,
} from "@/lib/server/apiResponse";
import { getLogisticsAdapter } from "@/lib/logistics/registry";
import { fromShipmentRow, type ShipmentRow } from "@/lib/server/shipments/createInternalShipment";
import {
  createServiceSupabaseClient,
  isServerSupabaseConfigured,
  isServiceRoleConfigured,
  requireSupabaseUser,
} from "@/lib/server/supabaseServer";

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

    // Already voided — return current state idempotently.
    if (shipment.label_status === "voided") {
      return apiError("Label is already voided.", 409);
    }

    const provider = shipment.provider ?? "internal";

    // ── ShipStation void ────────────────────────────────────────────────────
    if (provider === "shipstation") {
      if (shipment.label_status !== "purchased") {
        return apiError(
          `Cannot void a label with status '${shipment.label_status ?? "unknown"}'. ` +
            "Only purchased labels can be voided.",
          409,
        );
      }

      // Require service_role for atomic refund persistence.
      if (!isServiceRoleConfigured) {
        return apiError(
          "ShipStation void requires SUPABASE_SERVICE_ROLE_KEY to be configured on the server " +
            "for atomic refund persistence. See docs/SECURITY.md.",
          503,
        );
      }

      // Idempotency: if refund already exists, the void was already processed.
      const { data: existingRefund } = await supabase
        .from("balance_movements")
        .select("id")
        .eq("reference_id", shipmentId)
        .eq("type", "refund")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingRefund) {
        return apiSuccess({
          shipment: fromShipmentRow(shipment),
          labelStatus: "voided",
          refunded: true,
          message: "Label was already voided and refunded.",
        });
      }

      // Call ShipStation void API. This is the external action — do it FIRST.
      // Only proceed to internal refund if ShipStation confirms approval.
      const voidResult = await getLogisticsAdapter("shipstation").voidLabel({
        shipmentId: shipment.id,
        providerShipmentId: shipment.provider_shipment_id ?? undefined,
        trackingNumber: shipment.tracking_number,
        provider: "shipstation",
      });

      // ShipStation confirmed void. Now persist atomically: update status + insert refund.
      const serviceClient = createServiceSupabaseClient();
      const refundAmount = Number(shipment.customer_price ?? shipment.total ?? 0);

      const { data: voidRpcData, error: voidRpcError } = await serviceClient.rpc(
        "void_label_refund_transaction",
        {
          p_user_id: user.id,
          p_shipment_id: shipmentId,
          p_refund_amount: refundAmount,
          p_tracking_number: shipment.tracking_number ?? "",
          p_carrier_code: shipment.courier ?? "",
          p_service_code: shipment.provider_service_code ?? "",
        },
      );

      if (voidRpcError || !voidRpcData) {
        // ShipStation voided but we couldn't persist the refund.
        // Partially update label_status via user's client as a fallback record.
        await supabase
          .from("shipments")
          .update({ label_status: "voided" })
          .eq("id", shipmentId)
          .eq("user_id", user.id);

        if (isRpcNotFoundError(voidRpcError)) {
          return apiError(
            "Label voided in ShipStation but the refund RPC is not applied. " +
              "Apply migration 20260514_create_label_transaction_rpc.sql. " +
              `Contact support — tracking: ${shipment.tracking_number ?? shipmentId}.`,
            500,
          );
        }

        return apiError(
          "Label voided in ShipStation but refund persistence failed. " +
            `Contact support — tracking: ${shipment.tracking_number ?? shipmentId}.`,
          500,
        );
      }

      // Fetch updated shipment for the response.
      const { data: updatedShipment } = await supabase
        .from("shipments")
        .select("*")
        .eq("id", shipmentId)
        .eq("user_id", user.id)
        .single<ShipmentRow>();

      return apiSuccess({
        shipment: updatedShipment ? fromShipmentRow(updatedShipment) : fromShipmentRow(shipment),
        labelStatus: voidResult.labelStatus,
        refunded: voidResult.refunded,
        message: voidResult.message,
      });
    }

    // ── Internal/mock label void ────────────────────────────────────────────
    if (shipment.label_status && !["internal", "pending", null].includes(shipment.label_status)) {
      return apiError(
        `Cannot void a label with status '${shipment.label_status}'. ` +
          "Only internal or pending labels can be voided via this endpoint.",
        409,
      );
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

    const voidResult = await getLogisticsAdapter("internal").voidLabel({
      shipmentId: shipment.id,
      trackingNumber: shipment.tracking_number,
      provider: "internal",
    });

    return apiSuccess({
      shipment: updatedShipment ? fromShipmentRow(updatedShipment) : fromShipmentRow(shipment),
      labelStatus: voidResult.labelStatus,
      refunded: voidResult.refunded,
      message: voidResult.message,
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not void this label.");
  }
}
