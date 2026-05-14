import type { SupabaseClient } from "@supabase/supabase-js";
import { InsufficientFundsError } from "@/lib/logistics/errors";
import { getLogisticsAdapter } from "@/lib/logistics/registry";
import { isMissingSchemaColumnError } from "@/lib/server/apiResponse";
import {
  fromShipmentRow,
  getAvailableBalance,
  type ShipmentRow,
} from "@/lib/server/shipments/createInternalShipment";
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
};

export type ShipStationShipmentResult = {
  shipment: Envio;
  trackingNumber: string;
  labelStatus: "purchased";
  labelUrl: string | null;
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

function buildShipStationShipmentRow(
  shipmentId: string,
  userId: string,
  body: ShipStationLabelBody,
  labelResult: LabelResult,
  idempotencyKey: string,
): Record<string, unknown> {
  const rate = labelResult.rate;
  return {
    id: shipmentId,
    user_id: userId,
    tracking_number: labelResult.trackingNumber,
    sender_name: body.senderName?.trim() || "Sender",
    sender_phone: body.senderPhone?.trim() || "",
    origin_city: body.origin.city,
    recipient_name: body.recipientName?.trim() || "Recipient",
    recipient_phone: body.recipientPhone?.trim() || "",
    destination_city: body.destination.city,
    destination_address: body.destination.line1?.trim() || "",
    weight: Number(body.parcel.weight),
    product_type: body.productType?.trim() || "Package",
    courier: body.carrierCode,
    shipping_subtotal: rate.shippingSubtotal,
    cash_on_delivery_commission: 0,
    total: rate.customerPrice,
    cash_on_delivery: false,
    cash_amount: 0,
    status: "Pendiente",
    value: rate.customerPrice,
    provider: "shipstation",
    provider_shipment_id: labelResult.providerShipmentId ?? null,
    provider_label_id: labelResult.providerLabelId ?? null,
    provider_rate_id: null,
    provider_service_code: labelResult.providerServiceCode ?? null,
    label_url: null,
    label_format: body.labelFormat ?? null,
    payment_status: "paid",
    label_status: "purchased",
    provider_cost: rate.pricing.providerCost,
    platform_markup: rate.pricing.platformMarkup,
    customer_price: rate.pricing.customerPrice,
    currency: "USD",
    idempotency_key: idempotencyKey,
    metadata: {
      source: "shipstation_web",
      phase: "4b",
      carrierCode: body.carrierCode,
      serviceCode: body.serviceCode,
    },
  };
}

export async function createShipStationShipment(
  supabase: SupabaseClient,
  userId: string,
  body: ShipStationLabelBody,
): Promise<ShipStationShipmentResult> {
  validateBody(body);

  const idempotencyKey = body.idempotencyKey?.trim() || crypto.randomUUID();

  // 1. Check migration is applied + idempotency (combined — migration fails if idempotency_key col missing).
  const existingShipment = await checkMigrationAndIdempotency(supabase, userId, idempotencyKey);

  if (existingShipment?.label_status === "purchased" && existingShipment.provider_label_id) {
    const shipment = fromShipmentRow(existingShipment);
    return {
      shipment,
      trackingNumber: shipment.trackingNumber,
      labelStatus: "purchased",
      labelUrl: existingShipment.label_url ?? null,
      providerShipmentId: existingShipment.provider_shipment_id ?? null,
      providerLabelId: existingShipment.provider_label_id ?? null,
      providerServiceCode: existingShipment.provider_service_code ?? null,
      providerCost: Number(existingShipment.provider_cost ?? 0),
      platformMarkup: Number(existingShipment.platform_markup ?? 0),
      customerPrice: Number(existingShipment.customer_price ?? existingShipment.total ?? 0),
      currency: "USD",
      message: "Existing ShipStation label returned for this idempotency key.",
    };
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
  // All failures below must return enough information for manual recovery.

  const actualCost = labelResult.rate.pricing.customerPrice;
  const shipmentId = crypto.randomUUID();

  // 4. Persist shipment record.
  const shipmentRow = buildShipStationShipmentRow(shipmentId, userId, body, labelResult, idempotencyKey);
  const { data: savedShipment, error: shipmentError } = await supabase
    .from("shipments")
    .insert(shipmentRow)
    .select()
    .single<ShipmentRow>();

  if (shipmentError || !savedShipment) {
    // CRITICAL: Label purchased in ShipStation but shipment record failed to save.
    // The tracking number and provider IDs must be returned for manual recovery.
    const recoveryInfo = JSON.stringify({
      trackingNumber: labelResult.trackingNumber,
      providerShipmentId: labelResult.providerShipmentId,
      providerLabelId: labelResult.providerLabelId,
      serviceCode: labelResult.providerServiceCode,
      carrierCode: body.carrierCode,
      actualCost,
    });
    throw new Response(
      `CRITICAL: ShipStation label was purchased but the shipment record failed to save. ` +
        `Contact support with this recovery info: ${recoveryInfo}`,
      { status: 500 },
    );
  }

  // 5. Persist initial tracking event (non-critical — failure is logged, request still succeeds).
  const { error: trackingError } = await supabase.from("tracking_events").insert({
    shipment_id: shipmentId,
    user_id: userId,
    tracking_number: labelResult.trackingNumber,
    title: "Label purchased",
    description: `ShipStation label purchased. Carrier: ${body.carrierCode}, Service: ${body.serviceCode}.`,
    status: "Pendiente",
    source: "shipstation",
    is_real: true,
  });

  if (trackingError) {
    console.error("[createShipStationShipment] tracking_event insert failed:", trackingError.message);
  }

  // 6. Persist balance deduction (negative movement).
  const balanceMovementRow = {
    id: `MOV-${crypto.randomUUID()}`,
    user_id: userId,
    concept: `ShipStation label ${labelResult.trackingNumber}`,
    amount: -actualCost,
    type: "debit",
    reference_type: "shipment",
    reference_id: shipmentId,
    shipment_id: shipmentId,
    idempotency_key: idempotencyKey,
    created_by: userId,
    metadata: {
      trackingNumber: labelResult.trackingNumber,
      providerShipmentId: labelResult.providerShipmentId,
      source: "shipstation_web",
      provider: "shipstation",
      carrierCode: body.carrierCode,
      serviceCode: body.serviceCode,
    },
  };

  const { error: movementError } = await supabase.from("balance_movements").insert(balanceMovementRow);

  if (movementError) {
    // CRITICAL: Label purchased and shipment saved, but balance deduction failed.
    // User has a label without a debit. Must be resolved manually.
    console.error("[createShipStationShipment] CRITICAL: balance_movement insert failed:", movementError.message);
    throw new Response(
      `CRITICAL: ShipStation label purchased and shipment saved, but the balance deduction failed. ` +
        `Contact support. Tracking number: ${labelResult.trackingNumber}`,
      { status: 500 },
    );
  }

  const createdShipment = fromShipmentRow(savedShipment);

  return {
    shipment: createdShipment,
    trackingNumber: labelResult.trackingNumber,
    labelStatus: "purchased",
    labelUrl: null,
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
