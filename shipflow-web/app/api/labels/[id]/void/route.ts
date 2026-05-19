import {
  apiError,
  apiErrorFromUnknown,
  apiSuccess,
} from "@/lib/server/apiResponse";
import { getLogisticsAdapter } from "@/lib/logistics/registry";
import { ShipEngineLabelAdapter } from "@/lib/logistics/adapters/ShipEngineLabelAdapter";
import { createAuditLog, createReconciliationEvent } from "@/lib/server/auditLog";
import { fromShipmentRow, type ShipmentRow } from "@/lib/server/shipments/createInternalShipment";
import {
  createServiceSupabaseClient,
  isServerSupabaseConfigured,
  isServiceRoleConfigured,
  requireVerifiedUser,
} from "@/lib/server/supabaseServer";

function isShipEngineMode() {
  return process.env.SHIPSTATION_API_MODE?.trim().toLowerCase() === "shipengine";
}

function logVoidReconciliationFailure(
  requestId: string,
  userId: string,
  shipment: ShipmentRow,
  cause: unknown,
) {
  console.error("[ShipEngineVoidReconciliation]", {
    requestId,
    userId,
    shipmentId: shipment.id,
    trackingNumber: shipment.tracking_number,
    providerLabelId: shipment.provider_label_id ?? null,
    providerShipmentId: shipment.provider_shipment_id ?? null,
    timestamp: new Date().toISOString(),
    cause: cause instanceof Error ? cause.message : String(cause ?? "unknown"),
  });
}

async function auditVoidEvent(
  eventType: string,
  userId: string,
  shipment: ShipmentRow,
  message: string,
  severity: "info" | "warning" | "error" | "critical" = "info",
  metadata: Record<string, unknown> = {},
) {
  await createAuditLog({
    actorUserId: userId,
    userId,
    eventType,
    severity,
    entityType: "shipment",
    entityId: shipment.id,
    provider: shipment.provider ?? null,
    trackingNumber: shipment.tracking_number,
    message,
    metadata: {
      providerLabelId: shipment.provider_label_id ?? null,
      providerShipmentId: shipment.provider_shipment_id ?? null,
      labelStatus: shipment.label_status ?? null,
      paymentStatus: shipment.payment_status ?? null,
      ...metadata,
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    const { id } = await context.params;
    const shipmentId = decodeURIComponent(id ?? "").trim();
    if (!shipmentId) return apiError("Shipment ID is required.", 400);

    const { supabase, user } = await requireVerifiedUser(request);

    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", shipmentId)
      .eq("user_id", user.id)
      .maybeSingle<ShipmentRow>();

    if (shipmentError) throw shipmentError;
    if (!shipment) return apiError("Shipment not found.", 404);

    // Already voided — return current state idempotently without another refund.
    if (shipment.label_status === "voided") {
      await auditVoidEvent(
        "idempotency_conflict",
        user.id,
        shipment,
        "Duplicate void attempt returned existing voided shipment.",
        "warning",
      );
      return apiSuccess({
        shipment: fromShipmentRow(shipment),
        labelStatus: "voided",
        refunded: shipment.payment_status === "refunded",
        message: "This label has already been voided.",
      });
    }

    const provider = shipment.provider ?? "internal";

    if (process.env.ENABLE_REAL_LABEL_VOID !== "true") {
      await auditVoidEvent("label_void_failed", user.id, shipment, "Void attempt blocked because void is disabled.", "warning");
      return apiError("Void is not enabled yet.", 403);
    }

    // ── ShipStation void ────────────────────────────────────────────────────
    if (provider === "shipstation") {
      if (shipment.label_status !== "purchased") {
        await auditVoidEvent("label_void_failed", user.id, shipment, "Void blocked because label is not purchased.", "warning");
        return apiError(
          "This label cannot be voided in its current state.",
          409,
        );
      }

      if (shipment.payment_status !== "paid") {
        await auditVoidEvent("label_void_failed", user.id, shipment, "Void blocked because payment is not paid.", "warning");
        return apiError("Only paid labels can be voided and refunded.", 409);
      }

      // Require service_role for atomic refund persistence.
      if (!isServiceRoleConfigured) {
        await auditVoidEvent("label_void_failed", user.id, shipment, "Void blocked because service role is not configured.", "error");
        return apiError(
          "The server is not ready to void labels with automatic refunds.",
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
        await auditVoidEvent("idempotency_conflict", user.id, shipment, "Duplicate void/refund attempt found existing refund.", "warning");
        return apiSuccess({
          shipment: fromShipmentRow(shipment),
          labelStatus: "voided",
          refunded: true,
          message: "This label was already voided and refunded.",
        });
      }

      let voidResult;
      await auditVoidEvent("label_void_started", user.id, shipment, "Carrier label void started.");
      if (isShipEngineMode()) {
        if (!shipment.provider_label_id) {
          await auditVoidEvent("label_void_failed", user.id, shipment, "Void blocked because provider label ID is missing.", "warning");
          return apiError("This label cannot be voided because the carrier label ID is missing.", 409);
        }

        try {
          voidResult = await new ShipEngineLabelAdapter().voidLabel({
            shipmentId: shipment.id,
            providerLabelId: shipment.provider_label_id,
            providerShipmentId: shipment.provider_shipment_id ?? undefined,
            trackingNumber: shipment.tracking_number,
            provider: "shipstation",
          });
        } catch (error) {
          await auditVoidEvent(
            "label_void_failed",
            user.id,
            shipment,
            "Carrier could not void this label.",
            "error",
            { cause: error instanceof Error ? error.message : String(error ?? "unknown") },
          );
          throw error;
        }
      } else {
        try {
          voidResult = await getLogisticsAdapter("shipstation").voidLabel({
            shipmentId: shipment.id,
            providerShipmentId: shipment.provider_shipment_id ?? undefined,
            trackingNumber: shipment.tracking_number,
            provider: "shipstation",
          });
        } catch (error) {
          await auditVoidEvent(
            "label_void_failed",
            user.id,
            shipment,
            "Carrier could not void this label.",
            "error",
            { cause: error instanceof Error ? error.message : String(error ?? "unknown") },
          );
          throw error;
        }
      }

      await auditVoidEvent("label_void_succeeded", user.id, shipment, "Carrier void was approved.", "info", {
        providerStatus: voidResult.providerStatus ?? null,
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
        const requestId = crypto.randomUUID();
        logVoidReconciliationFailure(requestId, user.id, shipment, voidRpcError ?? "EMPTY_RPC_RESPONSE");
        await createReconciliationEvent({
          actorUserId: user.id,
          userId: user.id,
          eventType: "label_void_refund_failed",
          entityType: "shipment",
          entityId: shipment.id,
          provider: shipment.provider ?? null,
          trackingNumber: shipment.tracking_number,
          requestId,
          message: "Carrier void was approved but refund persistence failed.",
          metadata: {
            providerLabelId: shipment.provider_label_id ?? null,
            providerShipmentId: shipment.provider_shipment_id ?? null,
            refundAmount,
            cause: voidRpcError?.message ?? "EMPTY_RPC_RESPONSE",
          },
        }, serviceClient);
        return apiError(
          `The carrier voided this label, but the refund could not be saved. Please contact support with the request ID: ${requestId}.`,
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

      await auditVoidEvent("label_void_succeeded", user.id, updatedShipment ?? shipment, "Void/refund persisted successfully.", "info", {
        refundAmount,
      });

      return apiSuccess({
        shipment: updatedShipment ? fromShipmentRow(updatedShipment) : fromShipmentRow(shipment),
        labelStatus: voidResult.labelStatus,
        refunded: voidResult.refunded,
        message: voidResult.refunded ? "Label voided successfully. Refund issued to your balance." : "Label voided.",
      });
    }

    await auditVoidEvent("label_void_failed", user.id, shipment, "Void requested for unsupported provider.", "warning");
    return apiError("Void is not supported for this label yet.", 501);
  } catch (error) {
    if (!(error instanceof Response)) {
      return apiError("We could not void this label.", 500);
    }
    return apiErrorFromUnknown(error, "We could not void this label.");
  }
}
