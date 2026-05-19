import type { SupabaseClient } from "@supabase/supabase-js";
import { InsufficientFundsError } from "@/lib/logistics/errors";
import { ShipEngineLabelAdapter } from "@/lib/logistics/adapters/ShipEngineLabelAdapter";
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
import { createAuditLog, createReconciliationEvent } from "@/lib/server/auditLog";
import type { Address, CreateLabelInput, LabelResult, Parcel, RateResult } from "@/lib/logistics/types";
import type { Envio } from "@/lib/types";

export type ShipEngineLabelBody = {
  provider: "shipstation";
  providerRateId?: string;
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

export type ShipEngineShipmentResult = {
  shipment: Envio;
  shipmentId: string;
  trackingNumber: string;
  labelStatus: "purchased";
  labelUrl: string | null;
  providerShipmentId: string | null;
  providerLabelId: string | null;
  providerServiceCode: string | null;
  providerCost: number;
  platformMarkup: number;
  paymentFee: number;
  customerPrice: number;
  total: number;
  currency: "USD";
  carrier: string;
  service: string;
  message: string;
};

function validateBody(body: ShipEngineLabelBody) {
  const required = [
    body.origin?.line1,
    body.origin?.city,
    body.origin?.state,
    body.origin?.postalCode,
    body.destination?.line1,
    body.destination?.city,
    body.destination?.state,
    body.destination?.postalCode,
  ];
  if (required.some((value) => !value?.trim())) {
    throw new Response("Complete street address, city, state, and ZIP for both From and To.", { status: 400 });
  }
  if ((body.origin.country ?? "US") !== "US" || (body.destination.country ?? "US") !== "US") {
    throw new Response("Only U.S. domestic ShipEngine labels are supported right now.", { status: 400 });
  }
  if (
    !Number.isFinite(Number(body.parcel?.weight)) || Number(body.parcel.weight) <= 0 ||
    !Number.isFinite(Number(body.parcel?.length)) || Number(body.parcel.length) <= 0 ||
    !Number.isFinite(Number(body.parcel?.width)) || Number(body.parcel.width) <= 0 ||
    !Number.isFinite(Number(body.parcel?.height)) || Number(body.parcel.height) <= 0
  ) {
    throw new Response("Package weight, length, width, and height must be positive numbers.", { status: 400 });
  }
  if (!body.carrierCode?.trim() || !body.serviceCode?.trim()) {
    throw new Response("Carrier and service are required to purchase a ShipEngine label.", { status: 400 });
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
        "ShipEngine labels require the logistics migration and label RPC to be applied first.",
        { status: 503 },
      );
    }
    throw error;
  }

  return data;
}

function buildExistingResult(existing: ShipmentRow): ShipEngineShipmentResult {
  const shipment = fromShipmentRow(existing);
  const total = Number(existing.customer_price ?? existing.total ?? 0);
  return {
    shipment,
    shipmentId: existing.id,
    trackingNumber: existing.tracking_number,
    labelStatus: "purchased",
    labelUrl: existing.label_url ?? null,
    providerShipmentId: existing.provider_shipment_id ?? null,
    providerLabelId: existing.provider_label_id ?? null,
    providerServiceCode: existing.provider_service_code ?? null,
    providerCost: Number(existing.provider_cost ?? 0),
    platformMarkup: Number(existing.platform_markup ?? 0),
    paymentFee: Number(existing.payment_fee ?? 0),
    customerPrice: total,
    total,
    currency: "USD",
    carrier: existing.courier ?? "",
    service: existing.provider_service_code ?? "",
    message: "Existing ShipEngine label returned for this idempotency key.",
  };
}

function rateMatches(body: ShipEngineLabelBody, candidate: RateResult, expectedProviderCost: number | null) {
  const sameRateId = body.providerRateId && candidate.providerRateId === body.providerRateId;
  if (sameRateId) return true;

  const sameCarrier = candidate.courierId === body.carrierCode;
  const sameService = candidate.serviceCode === body.serviceCode;
  if (!sameCarrier || !sameService) return false;
  if (expectedProviderCost == null) return true;

  const delta = Math.abs(candidate.pricing.providerCost - expectedProviderCost);
  return delta <= Math.max(1, expectedProviderCost * 0.25);
}

async function revalidateShipEngineRate(body: ShipEngineLabelBody): Promise<RateResult> {
  const adapter = getLogisticsAdapter("shipstation");
  const rates = await adapter.getRates({
    origin: body.origin,
    destination: body.destination,
    parcel: {
      ...body.parcel,
      weight: Number(body.parcel.weight),
      length: Number(body.parcel.length),
      width: Number(body.parcel.width),
      height: Number(body.parcel.height),
    },
  });

  const expectedProviderCost =
    typeof body.expectedCost === "number" && body.expectedCost > 0 ? null : null;
  const exact = rates.find((rate) => body.providerRateId && rate.providerRateId === body.providerRateId);
  const compatible = rates.find((rate) => rateMatches(body, rate, expectedProviderCost));
  const selected = exact ?? compatible;
  if (!selected?.providerRateId) {
    throw new Response("Selected rate is no longer available. Please refresh rates and try again.", { status: 409 });
  }
  return selected;
}

function buildCreateLabelInput(
  body: ShipEngineLabelBody,
  idempotencyKey: string,
  revalidatedRate: RateResult,
): CreateLabelInput {
  return {
    origin: body.origin,
    destination: body.destination,
    parcel: {
      ...body.parcel,
      weight: Number(body.parcel.weight),
      length: Number(body.parcel.length),
      width: Number(body.parcel.width),
      height: Number(body.parcel.height),
    },
    provider: "shipstation",
    providerRateId: revalidatedRate.providerRateId,
    serviceCode: revalidatedRate.serviceCode,
    carrierCode: revalidatedRate.courierId,
    idempotencyKey,
    labelFormat: body.labelFormat ?? "pdf",
    senderName: body.senderName,
    senderPhone: body.senderPhone,
    recipientName: body.recipientName,
    recipientPhone: body.recipientPhone,
    productType: body.productType,
    revalidatedRate,
  };
}

function buildRpcParams(
  shipmentId: string,
  userId: string,
  body: ShipEngineLabelBody,
  labelResult: LabelResult,
  idempotencyKey: string,
  pricing = calculateCustomerPrice(labelResult.rate.pricing.providerCost),
): Record<string, unknown> {
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
    p_carrier_code: labelResult.rate.courierName || labelResult.rate.courierId,
    p_shipping_subtotal: pricing.providerCost,
    p_total: pricing.customerPrice,
    p_provider: "shipstation",
    p_provider_shipment_id: labelResult.providerShipmentId ?? null,
    p_provider_label_id: labelResult.providerLabelId ?? null,
    p_provider_service_code: labelResult.providerServiceCode ?? labelResult.rate.serviceCode,
    p_provider_cost: pricing.providerCost,
    p_platform_markup: pricing.platformMarkup,
    p_customer_price: pricing.customerPrice,
    p_currency: "USD",
    p_label_format: body.labelFormat ?? "pdf",
    p_metadata: {
      source: "shipengine_web",
      phase: "5.20C",
      providerRateId: labelResult.rate.providerRateId,
      labelUrl: labelResult.labelUrl,
      carrierCode: labelResult.rate.courierId,
      serviceCode: labelResult.rate.serviceCode,
    },
    p_payment_fee: pricing.paymentFee,
    p_pricing_subtotal: pricing.subtotal,
    p_pricing_model: "shipflow_v1",
    p_pricing_breakdown: pricing,
    p_provider_rate_id: labelResult.rate.providerRateId ?? null,
    p_label_url: labelResult.labelUrl ?? null,
    p_label_status: "purchased",
    p_payment_status: "paid",
  };
}

function isInvalidPricePreflightError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { message?: string };
  return candidate.message?.includes("INVALID_PRICE") ?? false;
}

function buildRpcPreflightParams(userId: string): Record<string, unknown> {
  return {
    p_user_id: userId,
    p_idempotency_key: `rpc-preflight-${crypto.randomUUID()}`,
    p_shipment_id: crypto.randomUUID(),
    p_tracking_number: "RPC-PREFLIGHT",
    p_sender_name: "Preflight",
    p_sender_phone: "",
    p_origin_city: "New York",
    p_recipient_name: "Preflight",
    p_recipient_phone: "",
    p_destination_city: "Mountain View",
    p_destination_addr: "Preflight",
    p_weight: 1,
    p_product_type: "Package",
    p_carrier_code: "preflight",
    p_shipping_subtotal: 0,
    p_total: 0,
    p_provider: "shipstation",
    p_provider_shipment_id: "preflight",
    p_provider_label_id: "preflight",
    p_provider_service_code: "preflight",
    p_provider_cost: 0,
    p_platform_markup: 0,
    p_customer_price: 0,
    p_currency: "USD",
    p_label_format: "pdf",
    p_metadata: { source: "rpc_preflight" },
    p_payment_fee: 0,
    p_pricing_subtotal: 0,
    p_pricing_model: "shipflow_v1",
    p_pricing_breakdown: {},
    p_provider_rate_id: "preflight-rate",
    p_label_url: "https://example.invalid/preflight.pdf",
    p_label_status: "purchased",
    p_payment_status: "paid",
  };
}

async function assertLabelTransactionRpcSupportsProviderFields(
  serviceClient: SupabaseClient,
  userId: string,
) {
  const { error } = await serviceClient.rpc(
    "create_label_shipment_transaction",
    buildRpcPreflightParams(userId),
  );

  if (!error || isInvalidPricePreflightError(error)) return;

  if (isRpcNotFoundError(error)) {
    throw new Response(
      "ShipEngine label purchase requires the hardened label transaction RPC migration before buying labels.",
      { status: 503 },
    );
  }

  throw new Response(
    "ShipEngine label purchase could not verify atomic label persistence. Please apply the label RPC migration first.",
    { status: 503 },
  );
}

function logReconciliationFailure(
  requestId: string,
  userId: string,
  idempotencyKey: string,
  labelResult: LabelResult,
  cause: unknown,
) {
  console.error("[ShipEngineLabelReconciliation]", {
    requestId,
    userId,
    idempotencyKey,
    timestamp: new Date().toISOString(),
    trackingNumber: labelResult.trackingNumber,
    providerShipmentId: labelResult.providerShipmentId ?? null,
    providerLabelId: labelResult.providerLabelId ?? null,
    providerRateId: labelResult.rate.providerRateId ?? null,
    cause: cause instanceof Error ? cause.message : String(cause ?? "unknown"),
  });
}

async function auditShipEngineLabelEvent(
  eventType: string,
  userId: string,
  idempotencyKey: string,
  message: string,
  metadata: Record<string, unknown> = {},
  severity: "info" | "warning" | "error" | "critical" = "info",
) {
  await createAuditLog({
    actorUserId: userId,
    userId,
    eventType,
    severity,
    entityType: "shipment",
    provider: "shipstation",
    idempotencyKey,
    message,
    metadata,
  });
}

export async function createShipEngineShipment(
  supabase: SupabaseClient,
  userId: string,
  body: ShipEngineLabelBody,
): Promise<ShipEngineShipmentResult> {
  validateBody(body);

  if (!isServiceRoleConfigured) {
    throw new Response(
      "ShipEngine labels require SUPABASE_SERVICE_ROLE_KEY for atomic persistence.",
      { status: 503 },
    );
  }

  const idempotencyKey = body.idempotencyKey?.trim() || crypto.randomUUID();
  const existingShipment = await checkMigrationAndIdempotency(supabase, userId, idempotencyKey);
  if (existingShipment?.label_status === "purchased" && existingShipment.provider_label_id) {
    await auditShipEngineLabelEvent(
      "idempotency_conflict",
      userId,
      idempotencyKey,
      "Existing purchased label returned for duplicate idempotency key.",
      {
        shipmentId: existingShipment.id,
        trackingNumber: existingShipment.tracking_number,
        providerLabelId: existingShipment.provider_label_id,
      },
      "warning",
    );
    return buildExistingResult(existingShipment);
  }
  if (existingShipment) {
    await auditShipEngineLabelEvent(
      "idempotency_conflict",
      userId,
      idempotencyKey,
      "Ambiguous label purchase idempotency state blocked.",
      {
        shipmentId: existingShipment.id,
        labelStatus: existingShipment.label_status ?? null,
        paymentStatus: existingShipment.payment_status ?? null,
      },
      "warning",
    );
    throw new Response(
      "This purchase is already being processed. Please refresh your shipments before trying again.",
      { status: 409 },
    );
  }

  await auditShipEngineLabelEvent("label_purchase_started", userId, idempotencyKey, "ShipEngine label purchase started.", {
    carrierCode: body.carrierCode,
    serviceCode: body.serviceCode,
    providerRateId: body.providerRateId ?? null,
  });

  let revalidatedRate: RateResult;
  try {
    revalidatedRate = await revalidateShipEngineRate(body);
  } catch (error) {
    await auditShipEngineLabelEvent(
      "label_purchase_failed",
      userId,
      idempotencyKey,
      "Selected rate is no longer available or could not be revalidated.",
      {
        carrierCode: body.carrierCode,
        serviceCode: body.serviceCode,
        cause: error instanceof Error ? error.message : String(error ?? "unknown"),
      },
      "warning",
    );
    throw error;
  }

  const pricing = calculateCustomerPrice(revalidatedRate.pricing.providerCost);
  const balance = await getAvailableBalance(supabase, userId);
  if (balance < pricing.customerPrice) {
    await auditShipEngineLabelEvent(
      "label_purchase_failed",
      userId,
      idempotencyKey,
      "Insufficient balance blocked label purchase before provider call.",
      {
        availableBalance: balance,
        requiredBalance: pricing.customerPrice,
      },
      "warning",
    );
    throw new InsufficientFundsError(
      `Insufficient balance. Available: $${balance.toFixed(2)} USD, required: $${pricing.customerPrice.toFixed(2)} USD.`,
    );
  }

  const serviceClient = createServiceSupabaseClient();
  await assertLabelTransactionRpcSupportsProviderFields(serviceClient, userId);

  const labelInput = buildCreateLabelInput(body, idempotencyKey, revalidatedRate);
  let labelResult: LabelResult;
  try {
    labelResult = await new ShipEngineLabelAdapter().createLabel(labelInput);
  } catch (error) {
    await auditShipEngineLabelEvent(
      "label_purchase_failed",
      userId,
      idempotencyKey,
      "Carrier could not generate this label.",
      {
        carrierCode: revalidatedRate.courierId,
        serviceCode: revalidatedRate.serviceCode,
        providerRateId: revalidatedRate.providerRateId ?? null,
        cause: error instanceof Error ? error.message : String(error ?? "unknown"),
      },
      "error",
    );
    throw error;
  }

  await auditShipEngineLabelEvent(
    "label_purchase_succeeded",
    userId,
    idempotencyKey,
    "Carrier purchased label successfully.",
    {
      trackingNumber: labelResult.trackingNumber,
      providerShipmentId: labelResult.providerShipmentId ?? null,
      providerLabelId: labelResult.providerLabelId ?? null,
      providerRateId: labelResult.rate.providerRateId ?? null,
      carrier: labelResult.rate.courierName || labelResult.rate.courierId,
      service: labelResult.rate.serviceName,
      hasLabelUrl: Boolean(labelResult.labelUrl),
    },
  );

  if (!labelResult.labelUrl) {
    await auditShipEngineLabelEvent(
      "label_url_missing",
      userId,
      idempotencyKey,
      "Carrier label URL was missing after successful purchase.",
      {
        trackingNumber: labelResult.trackingNumber,
        providerLabelId: labelResult.providerLabelId ?? null,
      },
      "warning",
    );
  }

  const actualPricing = calculateCustomerPrice(labelResult.rate.pricing.providerCost);

  if (balance < actualPricing.customerPrice) {
    const requestId = crypto.randomUUID();
    logReconciliationFailure(requestId, userId, idempotencyKey, labelResult, "INSUFFICIENT_FUNDS_AFTER_PURCHASE");
    await createReconciliationEvent({
      actorUserId: userId,
      userId,
      eventType: "label_purchase_db_persist_failed",
      entityType: "shipment",
      provider: "shipstation",
      trackingNumber: labelResult.trackingNumber,
      idempotencyKey,
      requestId,
      message: "Label was purchased but could not be saved because balance became insufficient after purchase.",
      metadata: {
        providerLabelId: labelResult.providerLabelId ?? null,
        providerShipmentId: labelResult.providerShipmentId ?? null,
        providerRateId: labelResult.rate.providerRateId ?? null,
        carrier: labelResult.rate.courierName || labelResult.rate.courierId,
        service: labelResult.rate.serviceName,
      },
    }, serviceClient);
    throw new Response(
      `Label was purchased but could not be saved. Please contact support with the request ID: ${requestId}.`,
      { status: 500 },
    );
  }

  const shipmentId = crypto.randomUUID();
  const { data: rpcData, error: rpcError } = await serviceClient.rpc(
    "create_label_shipment_transaction",
    buildRpcParams(shipmentId, userId, body, labelResult, idempotencyKey, actualPricing),
  );

  if (rpcError || !rpcData) {
    const requestId = crypto.randomUUID();
    logReconciliationFailure(requestId, userId, idempotencyKey, labelResult, rpcError ?? "EMPTY_RPC_RESPONSE");
    await createReconciliationEvent({
      actorUserId: userId,
      userId,
      eventType: "label_purchase_db_persist_failed",
      entityType: "shipment",
      provider: "shipstation",
      trackingNumber: labelResult.trackingNumber,
      idempotencyKey,
      requestId,
      message: "Label was purchased but the atomic DB/RPC persistence failed.",
      metadata: {
        providerLabelId: labelResult.providerLabelId ?? null,
        providerShipmentId: labelResult.providerShipmentId ?? null,
        providerRateId: labelResult.rate.providerRateId ?? null,
        carrier: labelResult.rate.courierName || labelResult.rate.courierId,
        service: labelResult.rate.serviceName,
        cause: rpcError?.message ?? "EMPTY_RPC_RESPONSE",
      },
    }, serviceClient);
    throw new Response(
      `Label was purchased but could not be saved. Please contact support with the request ID: ${requestId}.`,
      { status: 500 },
    );
  }

  const result = rpcData as { status: "created" | "existing"; shipment_id: string };
  const fetchId = result.shipment_id ?? shipmentId;

  const { data: savedShipment } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", fetchId)
    .eq("user_id", userId)
    .single<ShipmentRow>();

  const shipment = savedShipment ? fromShipmentRow(savedShipment) : {
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
    courier: labelResult.rate.courierName || labelResult.rate.courierId,
    shippingSubtotal: actualPricing.providerCost,
    cashOnDeliveryCommission: 0,
    total: actualPricing.customerPrice,
    cashOnDelivery: false,
    cashAmount: 0,
    status: "Pendiente" as const,
    value: actualPricing.customerPrice,
    date: new Date().toISOString(),
  };

  await auditShipEngineLabelEvent(
    "label_purchase_succeeded",
    userId,
    idempotencyKey,
    "ShipEngine label purchase persisted successfully.",
    {
      shipmentId: fetchId,
      trackingNumber: labelResult.trackingNumber,
      providerLabelId: labelResult.providerLabelId ?? null,
      customerPrice: actualPricing.customerPrice,
    },
  );

  return {
    shipment,
    shipmentId: fetchId,
    trackingNumber: labelResult.trackingNumber,
    labelStatus: "purchased",
    labelUrl: labelResult.labelUrl,
    providerShipmentId: labelResult.providerShipmentId ?? null,
    providerLabelId: labelResult.providerLabelId ?? null,
    providerServiceCode: labelResult.providerServiceCode ?? labelResult.rate.serviceCode,
    providerCost: actualPricing.providerCost,
    platformMarkup: actualPricing.platformMarkup,
    paymentFee: actualPricing.paymentFee,
    customerPrice: actualPricing.customerPrice,
    total: actualPricing.customerPrice,
    currency: "USD",
    carrier: labelResult.rate.courierName || labelResult.rate.courierId,
    service: labelResult.rate.serviceName,
    message: labelResult.message,
  };
}
