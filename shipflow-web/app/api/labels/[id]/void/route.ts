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
  requireVerifiedUser,
} from "@/lib/server/supabaseServer";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isServerSupabaseConfigured) {
    return apiError("El servidor no está configurado correctamente.", 503);
  }

  try {
    const { id } = await context.params;
    const shipmentId = decodeURIComponent(id ?? "").trim();
    if (!shipmentId) return apiError("El ID del envío es requerido.", 400);

    const { supabase, user } = await requireVerifiedUser(request);

    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", shipmentId)
      .eq("user_id", user.id)
      .maybeSingle<ShipmentRow>();

    if (shipmentError) throw shipmentError;
    if (!shipment) return apiError("Envío no encontrado.", 404);

    // Already voided — return current state idempotently.
    if (shipment.label_status === "voided") {
      return apiError("La guía ya está anulada.", 409);
    }

    const provider = shipment.provider ?? "internal";

    // ── ShipStation void ────────────────────────────────────────────────────
    if (provider === "shipstation") {
      if (shipment.label_status !== "purchased") {
        return apiError(
          "Esta guía no se puede anular en su estado actual.",
          409,
        );
      }

      // Require service_role for atomic refund persistence.
      if (!isServiceRoleConfigured) {
        return apiError(
          "El servidor no está listo para anular guías con reembolso automático.",
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
          message: "La guía ya fue anulada y reembolsada.",
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
            `La guía fue anulada, pero el reembolso requiere revisión manual. Contacta soporte con tracking: ${shipment.tracking_number ?? shipmentId}.`,
            500,
          );
        }

        return apiError(
          `La guía fue anulada, pero el reembolso requiere revisión manual. Contacta soporte con tracking: ${shipment.tracking_number ?? shipmentId}.`,
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
        message: voidResult.refunded ? "Guía anulada y reembolsada." : "Guía anulada.",
      });
    }

    // ── Internal/mock label void ────────────────────────────────────────────
    if (shipment.label_status && !["internal", "pending", null].includes(shipment.label_status)) {
      return apiError(
        "Esta guía no se puede anular en su estado actual.",
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
      return apiError("Anular guías requiere completar la configuración de base de datos.", 501);
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
      message: "Guía anulada.",
    });
  } catch (error) {
    if (!(error instanceof Response)) {
      return apiError("No se pudo anular esta guía.", 500);
    }
    return apiErrorFromUnknown(error, "No se pudo anular esta guía.");
  }
}
