import type { SupabaseClient } from "@supabase/supabase-js";
import { InsufficientFundsError } from "@/lib/logistics/errors";
import { getLogisticsAdapter } from "@/lib/logistics/registry";
import { calculateCustomerPrice } from "@/lib/logistics/pricing";
import { isMissingSchemaColumnError, isRpcNotFoundError } from "@/lib/server/apiResponse";
import {
  fromShipmentRow,
  getAvailableBalance,
  type ShipmentRow,
} from "@/lib/server/shipments/createInternalShipment";
import {
  createServiceSupabaseClient,
  isServiceRoleConfigured,
} from "@/lib/server/supabaseServer";
import type { Address, CreateLabelInput, LabelResult, Parcel } from "@/lib/logistics/types";
import type { Envio } from "@/lib/types";

export type ShipStationLabelBody = {
  provider: "shipstation";
  origin: Address;
  destination: Address;
  parcel: Parcel;
  carrierCode: string;
  serviceCode: string;
  expectedCost?: number;
  labelFormat?: "pdf" | "zpl" | "png";
  idempotencyKey?: string;
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  productType?: string;
  // FASE 5.10: pricing breakdown from the frontend (informational → persisted)
  platformMarkup?: number;
  paymentFee?: number;
  pricingSubtotal?: number;
  pricingModel?: string;
  pricingBreakdown?: Record<string, unknown>;
};

export type ShipStationShipmentResult = {
  shipment: Envio;
  trackingNumber: string;
  labelStatus: "purchased";
  labelUrl: string | null;
  labelData: string | null; // base64 PDF for immediate client use; not stored in DB
  providerShipmentId: string | null;
  providerLabelId: string | null;
  providerServiceCode: string | null;
  providerCost: number;
  platformMarkup: number;
  customerPrice: number;
  currency: "USD";
  message: string;
};

function validateBody(body: ShipStationLabelBody) {
  if (!body.origin?.city?.trim()) {
    throw new Response("origin.city is required.", { status: 400 });
  }
  if (!body.origin?.postalCode?.trim()) {
    throw new Response("origin.postalCode is required for ShipStation labels.", { status: 400 });
  }
  if (!body.destination?.city?.trim()) {
    throw new Response("destination.city is required.", { status: 400 });
  }
  if (!body.destination?.postalCode?.trim()) {
    throw new Response("destination.postalCode is required for ShipStation labels.", { status: 400 });
  }
  if (!Number.isFinite(Number(body.parcel?.weight)) || Number(body.parcel?.weight) <= 0) {
    throw new Response("parcel.weight must be a positive number.", { status: 400 });
  }
  if (!body.carrierCode?.trim()) {
    throw new Response(
      "carrierCode is required for ShipStation labels (e.g. stamps_com, ups, fedex).",
      { status: 400 },
    );
  }
  if (!body.serviceCode?.trim()) {
    throw new Response(
      "serviceCode is required. Get it from POST /api/rates with provider: \"shipstation\".",
      { status: 400 },
    );
  }
}

async function checkMigrationAndIdempotency(
  supabase: SupabaseClient,
  userId: string,
  idempotencyKey: string,
): Promise<ShipmentRow | null> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("user_id", userId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle<ShipmentRow>();

  if (error) {
    if (isMissingSchemaColumnError(error)) {
      throw new Response(
        "ShipStation labels require the logistics migration (FASE 1C) to be applied. " +
          "Follow docs/MIGRATION_1D_CHECKLIST.md and apply the migration in Supabase first.",
        { status: 503 },
      );
    }
    throw error;
  }

  return data;
}

function buildCreateLabelInput(body: ShipStationLabelBody, idempotencyKey: string): CreateLabelInput {
  return {
    origin: body.origin,
    destination: body.destination,
    parcel: { ...body.parcel, weight: Number(body.parcel.weight) },
    courier: body.carrierCode,
    idempotencyKey,
    provider: "shipstation",
    serviceCode: body.serviceCode,
    carrierCode: body.carrierCode,
    labelFormat: body.labelFormat,
    senderName: body.senderName,
    senderPhone: body.senderPhone,
    recipientName: body.recipientName,
    recipientPhone: body.recipientPhone,
    productType: body.productType,
  };
}

function buildRpcParams(
  shipmentId: string,
  userId: string,
  body: ShipStationLabelBody,
  labelResult: LabelResult,
  idempotencyKey: string,
): Record<string, unknown> {
  const rate = labelResult.rate;

  // Prefer pricing data from body (set by the frontend from the selected rate).
  // If absent, recalculate from providerCost using the current pricing engine.
  // This guards against stale adapter pricing that lacks payment_fee (e.g. applyMarkup path).
  const fallback = calculateCustomerPrice(rate.pricing.providerCost);
  const paymentFee = typeof body.paymentFee === "number" && body.paymentFee >= 0
    ? body.paymentFee
    : fallback.paymentFee;
  const platformMarkup = typeof body.platformMarkup === "number" && body.platformMarkup >= 0
    ? body.platformMarkup
    : rate.pricing.platformMarkup;
  const pricingSubtotal = typeof body.pricingSubtotal === "number" && body.pricingSubtotal >= 0
    ? body.pricingSubtotal
    : fallback.subtotal;
  const pricingModel = body.pricingModel ?? "shipflow_v1";

  // pricing_breakdown: prefer explicit snapshot from body; otherwise build from rate.
  const pricingBreakdown: Record<string, unknown> = body.pricingBreakdown ?? {
    providerCost: rate.pricing.providerCost,
    platformMarkup,
    subtotal: pricingSubtotal,
    paymentFee,
    customerPrice: rate.pricing.customerPrice,
    markupPercentage: rate.pricing.markupPercentage ?? fallback.markupPercentage,
    markupMinimum: rate.pricing.markupMinimum ?? fallback.markupMinimum,
    paymentFeePercentage: rate.pricing.paymentFeePercentage ?? fallback.paymentFeePercentage,
    paymentFeeFixed: rate.pricing.paymentFeeFixed ?? fallback.paymentFeeFixed,
  };

  return {
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
    p_shipment_id: shipmentId,
    p_tracking_number: labelResult.trackingNumber,
    p_sender_name: body.senderName?.trim() || "Sender",
    p_sender_phone: body.senderPhone?.trim() || "",
    p_origin_city: body.origin.city,
    p_recipient_name: body.recipientName?.trim() || "Recipient",
    p_recipient_phone: body.recipientPhone?.trim() || "",
    p_destination_city: body.destination.city,
    p_destination_addr: body.destination.line1?.trim() || "",
    p_weight: Number(body.parcel.weight),
    p_product_type: body.productType?.trim() || "Package",
    p_carrier_code: body.carrierCode,
    p_shipping_subtotal: rate.shippingSubtotal,
    p_total: rate.pricing.customerPrice,
    p_provider: "shipstation",
    p_provider_shipment_id: labelResult.providerShipmentId ?? null,
    p_provider_label_id: labelResult.providerLabelId ?? null,
    p_provider_service_code: labelResult.providerServiceCode ?? null,
    p_provider_cost: rate.pricing.providerCost,
    p_platform_markup: platformMarkup,
    p_customer_price: rate.pricing.customerPrice,
    p_currency: "USD",
    p_label_format: body.labelFormat ?? null,
    p_metadata: {
      source: "shipstation_web",
      phase: "5.10",
      carrierCode: body.carrierCode,
      serviceCode: body.serviceCode,
    },
    // FASE 5.10: financial pricing breakdown
    p_payment_fee: paymentFee,
    p_pricing_subtotal: pricingSubtotal,
    p_pricing_model: pricingModel,
    p_pricing_breakdown: pricingBreakdown,
  };
}

function buildExistingResult(existing: ShipmentRow): ShipStationShipmentResult {
  return {
    shipment: fromShipmentRow(existing),
    trackingNumber: existing.tracking_number,
    labelStatus: "purchased",
    labelUrl: existing.label_url ?? null,
    labelData: null, // Not stored in DB; not recoverable from idempotent re-entry
    providerShipmentId: existing.provider_shipment_id ?? null,
    providerLabelId: existing.provider_label_id ?? null,
    providerServiceCode: existing.provider_service_code ?? null,
    providerCost: Number(existing.provider_cost ?? 0),
    platformMarkup: Number(existing.platform_markup ?? 0),
    customerPrice: Number(existing.customer_price ?? existing.total ?? 0),
    currency: "USD",
    message: "Existing ShipStation label returned for this idempotency key.",
  };
}

export async function createShipStationShipment(
  supabase: SupabaseClient,
  userId: string,
  body: ShipStationLabelBody,
): Promise<ShipStationShipmentResult> {
  validateBody(body);

  // Pre-flight: require service_role for atomic RPC persistence.
  // This check happens BEFORE buying the label to avoid purchasing without being able to persist.
  if (!isServiceRoleConfigured) {
    throw new Response(
      "ShipStation labels require SUPABASE_SERVICE_ROLE_KEY to be configured on the server " +
        "for atomic persistence via create_label_shipment_transaction RPC. " +
        "See docs/SECURITY.md for setup instructions.",
      { status: 503 },
    );
  }

  const idempotencyKey = body.idempotencyKey?.trim() || crypto.randomUUID();

  // 1. Check migration is applied + idempotency (combined — migration fails if idempotency_key col missing).
  const existingShipment = await checkMigrationAndIdempotency(supabase, userId, idempotencyKey);

  if (existingShipment?.label_status === "purchased" && existingShipment.provider_label_id) {
    return buildExistingResult(existingShipment);
  }

  // 2. Balance check before calling ShipStation.
  const balance = await getAvailableBalance(supabase, userId);
  const expectedCost =
    typeof body.expectedCost === "number" && body.expectedCost > 0 ? body.expectedCost : null;

  if (expectedCost !== null && balance < expectedCost) {
    throw new InsufficientFundsError(
      `Insufficient balance. Available: $${balance.toFixed(2)} USD, ` +
        `expected label cost: $${expectedCost.toFixed(2)} USD.`,
    );
  } else if (expectedCost === null && balance <= 0) {
    throw new InsufficientFundsError(
      "Insufficient balance. Please add funds before creating a ShipStation label.",
    );
  }

  // 3. Purchase real label from ShipStation. This charges the ShipStation account.
  //    Any failure after this point is a critical state: label purchased but not yet persisted.
  const adapter = getLogisticsAdapter("shipstation");
  const createLabelInput = buildCreateLabelInput(body, idempotencyKey);
  const labelResult = await adapter.createLabel(createLabelInput);

  // LABEL IS NOW PURCHASED IN SHIPSTATION.
  // All failures below MUST return enough information for manual recovery.

  const shipmentId = crypto.randomUUID();
  const rpcParams = buildRpcParams(shipmentId, userId, body, labelResult, idempotencyKey);

  // 4. Persist atomically via service_role RPC. No silent fallback to sequential inserts.
  let serviceClient: ReturnType<typeof createServiceSupabaseClient>;
  try {
    serviceClient = createServiceSupabaseClient();
  } catch {
    const recoveryInfo = buildRecoveryInfo(labelResult, body);
    throw new Response(
      `CRITICAL: ShipStation label purchased but service role client could not be created. ` +
        `Contact support immediately. Recovery info: ${recoveryInfo}`,
      { status: 500 },
    );
  }

  const { data: rpcData, error: rpcError } = await serviceClient.rpc(
    "create_label_shipment_transaction",
    rpcParams,
  );

  if (rpcError || !rpcData) {
    const recoveryInfo = buildRecoveryInfo(labelResult, body);
    if (isRpcNotFoundError(rpcError)) {
      throw new Response(
        `CRITICAL: ShipStation label purchased but the persistence RPC is not available. ` +
          `Apply migration 20260514_create_label_transaction_rpc.sql to Supabase first. ` +
          `Recovery info: ${recoveryInfo}`,
        { status: 500 },
      );
    }
    throw new Response(
      `CRITICAL: ShipStation label purchased but atomic persistence failed. ` +
        `Contact support immediately. Recovery info: ${recoveryInfo}`,
      { status: 500 },
    );
  }

  const result = rpcData as { status: "created" | "existing"; shipment_id: string };
  const fetchId = result.shipment_id ?? shipmentId;

  // 5. Fetch the persisted shipment to build the response.
  const { data: savedShipment, error: fetchError } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", fetchId)
    .eq("user_id", userId)
    .single<ShipmentRow>();

  if (fetchError || !savedShipment) {
    // RPC succeeded but read failed (e.g., RLS timing). Return minimal result.
    console.error("[createShipStationShipment] Could not read saved shipment after RPC success:", fetchId);
    return {
      shipment: {
        id: fetchId,
        trackingNumber: labelResult.trackingNumber,
        userId,
        senderName: body.senderName ?? "",
        senderPhone: body.senderPhone ?? "",
        originCity: body.origin.city,
        recipientName: body.recipientName ?? "",
        recipientPhone: body.recipientPhone ?? "",
        destinationCity: body.destination.city,
        destinationAddress: body.destination.line1 ?? "",
        weight: Number(body.parcel.weight),
        productType: body.productType ?? "Package",
        courier: body.carrierCode,
        shippingSubtotal: labelResult.rate.shippingSubtotal,
        cashOnDeliveryCommission: 0,
        total: labelResult.rate.customerPrice,
        cashOnDelivery: false,
        cashAmount: 0,
        status: "Pendiente",
        value: labelResult.rate.customerPrice,
        date: new Date().toISOString(),
      },
      trackingNumber: labelResult.trackingNumber,
      labelStatus: "purchased",
      labelUrl: null,
      labelData: labelResult.labelData ?? null,
      providerShipmentId: labelResult.providerShipmentId ?? null,
      providerLabelId: labelResult.providerLabelId ?? null,
      providerServiceCode: labelResult.providerServiceCode ?? null,
      providerCost: labelResult.rate.pricing.providerCost,
      platformMarkup: labelResult.rate.pricing.platformMarkup,
      customerPrice: labelResult.rate.pricing.customerPrice,
      currency: "USD",
      message: labelResult.message,
    };
  }

  return {
    shipment: fromShipmentRow(savedShipment),
    trackingNumber: labelResult.trackingNumber,
    labelStatus: "purchased",
    labelUrl: null,
    // labelData: base64 PDF from ShipStation V1. Not stored in DB.
    // Client should save it immediately for printing; it will not be recoverable later.
    labelData: labelResult.labelData ?? null,
    providerShipmentId: labelResult.providerShipmentId ?? null,
    providerLabelId: labelResult.providerLabelId ?? null,
    providerServiceCode: labelResult.providerServiceCode ?? null,
    providerCost: labelResult.rate.pricing.providerCost,
    platformMarkup: labelResult.rate.pricing.platformMarkup,
    customerPrice: labelResult.rate.pricing.customerPrice,
    currency: "USD",
    message: labelResult.message,
  };
}

function buildRecoveryInfo(labelResult: LabelResult, body: ShipStationLabelBody): string {
  return JSON.stringify({
    trackingNumber: labelResult.trackingNumber,
    providerShipmentId: labelResult.providerShipmentId,
    providerLabelId: labelResult.providerLabelId,
    serviceCode: labelResult.providerServiceCode,
    carrierCode: body.carrierCode,
    actualCost: labelResult.rate.pricing.customerPrice,
  });
}
