import type { SupabaseClient } from "@supabase/supabase-js";
import { getLogisticsAdapter } from "@/lib/logistics/registry";
import { isMissingSchemaColumnError } from "@/lib/server/apiResponse";
import type { CreateLabelInput, RateInput, RateResult } from "@/lib/logistics/types";
import type { CourierConfig, Envio, ShipmentStatus, TrackingEvent } from "@/lib/types";

export type CreateInternalShipmentInput = {
  senderName?: string;
  senderPhone?: string;
  originCity?: string;
  recipientName?: string;
  recipientPhone?: string;
  destinationCity?: string;
  destinationAddress?: string;
  weight?: number;
  productType?: string;
  courier?: string;
  cashOnDelivery?: boolean;
  cashAmount?: number;
  idempotencyKey?: string;
};

export type RateRequestInput = {
  originCity?: string;
  destinationCity?: string;
  weight?: number;
  courier?: string;
  cashOnDelivery?: boolean;
  cashAmount?: number;
};

export type InternalRateOption = RateResult;

export type InternalLabelResult = {
  shipment: Envio;
  trackingNumber: string;
  labelStatus: "internal";
  labelUrl: null;
  message: string;
};

type CourierRow = {
  id: string;
  nombre: string;
  activo: boolean;
  logo_url: string | null;
  cobertura: string;
  precio_base: number;
  precio_por_kg: number;
  permite_contra_entrega: boolean;
  comision_contra_entrega: number;
  tiempo_estimado: string;
  notas: string | null;
};

export type ShipmentRow = {
  id: string;
  user_id?: string;
  tracking_number: string;
  sender_name: string;
  sender_phone: string;
  origin_city: string;
  recipient_name: string;
  recipient_phone: string;
  destination_city: string;
  destination_address: string;
  weight: number;
  product_type: string;
  courier: string;
  shipping_subtotal?: number;
  cash_on_delivery_commission?: number;
  total?: number;
  cash_on_delivery: boolean;
  cash_amount: number;
  status: ShipmentStatus;
  value: number;
  payment_status?: string;
  label_status?: string;
  provider?: string | null;
  provider_shipment_id?: string | null;
  provider_label_id?: string | null;
  provider_rate_id?: string | null;
  provider_service_code?: string | null;
  provider_cost?: number | null;
  platform_markup?: number;
  customer_price?: number | null;
  currency?: string;
  // FASE 5.10: financial pricing breakdown
  payment_fee?: number | null;
  pricing_subtotal?: number | null;
  pricing_model?: string | null;
  pricing_breakdown?: Record<string, unknown> | null;
  idempotency_key?: string | null;
  label_url?: string | null;
  label_format?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export type TrackingEventRow = {
  id: string;
  shipment_id: string;
  tracking_number: string;
  title: string;
  description?: string | null;
  status: string;
  event_date?: string | null;
  created_at: string;
};

type BalanceMovementRow = {
  amount: number;
};

function requiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function fromCourierRow(row: CourierRow): CourierConfig {
  return {
    id: row.id,
    nombre: row.nombre,
    activo: row.activo,
    logoUrl: row.logo_url ?? "",
    cobertura: row.cobertura,
    precioBase: Number(row.precio_base),
    precioPorKg: Number(row.precio_por_kg),
    permiteContraEntrega: row.permite_contra_entrega,
    comisionContraEntrega: Number(row.comision_contra_entrega),
    tiempoEstimado: row.tiempo_estimado,
    notas: row.notas ?? "",
  };
}

export function fromShipmentRow(row: ShipmentRow): Envio {
  return {
    id: row.id,
    userId: row.user_id,
    trackingNumber: row.tracking_number,
    senderName: row.sender_name,
    senderPhone: row.sender_phone,
    originCity: row.origin_city,
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone,
    destinationCity: row.destination_city,
    destinationAddress: row.destination_address,
    weight: Number(row.weight),
    productType: row.product_type,
    courier: row.courier,
    shippingSubtotal: Number(row.shipping_subtotal ?? row.value),
    cashOnDeliveryCommission: Number(row.cash_on_delivery_commission ?? 0),
    total: Number(row.total ?? row.value),
    cashOnDelivery: row.cash_on_delivery,
    cashAmount: Number(row.cash_amount),
    status: row.status,
    value: Number(row.value),
    date: row.created_at,
    provider: row.provider ?? null,
    labelStatus: row.label_status ?? null,
    paymentStatus: row.payment_status ?? null,
    customerPrice: row.customer_price != null ? Number(row.customer_price) : null,
    providerShipmentId: row.provider_shipment_id ?? null,
    providerCost: row.provider_cost != null ? Number(row.provider_cost) : null,
    platformMarkup: row.platform_markup != null ? Number(row.platform_markup) : null,
    paymentFee: row.payment_fee != null ? Number(row.payment_fee) : null,
    pricingSubtotal: row.pricing_subtotal != null ? Number(row.pricing_subtotal) : null,
    pricingModel: row.pricing_model ?? null,
    pricingBreakdown: row.pricing_breakdown ?? null,
  };
}

export function fromTrackingEventRow(row: TrackingEventRow): TrackingEvent {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    trackingNumber: row.tracking_number,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status === "Entregado" || row.status === "En tránsito" || row.status === "Pendiente" ? row.status : "Pendiente",
    date: row.event_date ?? row.created_at,
  };
}

function normalizeCreateInput(body: CreateInternalShipmentInput) {
  return {
    senderName: requiredText(body.senderName),
    senderPhone: requiredText(body.senderPhone),
    originCity: requiredText(body.originCity),
    recipientName: requiredText(body.recipientName),
    recipientPhone: requiredText(body.recipientPhone),
    destinationCity: requiredText(body.destinationCity),
    destinationAddress: requiredText(body.destinationAddress),
    weight: Number(body.weight),
    productType: requiredText(body.productType),
    courier: requiredText(body.courier),
    cashOnDelivery: Boolean(body.cashOnDelivery),
    cashAmount: Number(body.cashAmount ?? 0),
    idempotencyKey: requiredText(body.idempotencyKey) || crypto.randomUUID(),
  };
}

function validateCreateInput(input: ReturnType<typeof normalizeCreateInput>) {
  if (
    !input.senderName ||
    !input.senderPhone ||
    !input.originCity ||
    !input.recipientName ||
    !input.recipientPhone ||
    !input.destinationCity ||
    !input.destinationAddress ||
    !input.productType ||
    !input.courier
  ) {
    throw new Response("Complete all required shipment fields.", { status: 400 });
  }

  validateRateFields(input);
}

function validateRateFields(input: ReturnType<typeof normalizeCreateInput> | ReturnType<typeof normalizeRateInput>) {
  if (!input.originCity || !input.destinationCity) {
    throw new Response("Enter origin and destination.", { status: 400 });
  }

  if (!Number.isFinite(input.weight) || input.weight <= 0) {
    throw new Response("Enter a valid package weight.", { status: 400 });
  }

  if (input.cashOnDelivery && (!Number.isFinite(input.cashAmount) || input.cashAmount <= 0)) {
    throw new Response("Enter a valid cash on delivery amount.", { status: 400 });
  }
}

function normalizeRateInput(body: RateRequestInput) {
  return {
    originCity: requiredText(body.originCity),
    destinationCity: requiredText(body.destinationCity),
    weight: Number(body.weight),
    courier: requiredText(body.courier),
    cashOnDelivery: Boolean(body.cashOnDelivery),
    cashAmount: Number(body.cashAmount ?? 0),
  };
}

async function getActiveCouriers(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("couriers")
    .select("*")
    .eq("activo", true)
    .returns<CourierRow[]>();

  if (error) throw error;
  return (data ?? []).map(fromCourierRow);
}

function findCourier(couriers: CourierConfig[], courierName: string) {
  return couriers.find((courier) => courier.id === courierName || courier.nombre === courierName) ?? null;
}

function toRateInput(input: ReturnType<typeof normalizeCreateInput> | ReturnType<typeof normalizeRateInput>): RateInput {
  return {
    origin: {
      city: input.originCity,
    },
    destination: {
      city: input.destinationCity,
      line1: "destinationAddress" in input ? input.destinationAddress : undefined,
    },
    parcel: {
      weight: input.weight,
      weightUnit: "lb",
    },
    courier: input.courier || undefined,
    cashOnDelivery: input.cashOnDelivery,
    cashAmount: input.cashAmount,
  };
}

function toCreateLabelInput(input: ReturnType<typeof normalizeCreateInput>): CreateLabelInput {
  return {
    ...toRateInput(input),
    idempotencyKey: input.idempotencyKey,
    senderName: input.senderName,
    senderPhone: input.senderPhone,
    recipientName: input.recipientName,
    recipientPhone: input.recipientPhone,
    destinationAddress: input.destinationAddress,
    productType: input.productType,
  };
}

export async function calculateInternalRates(supabase: SupabaseClient, body: RateRequestInput) {
  const input = normalizeRateInput(body);
  validateRateFields(input);

  const couriers = await getActiveCouriers(supabase);
  const selectedCouriers = input.courier
    ? couriers.filter((courier) => courier.id === input.courier || courier.nombre === input.courier)
    : couriers;

  if (selectedCouriers.length === 0) {
    throw new Response("Selected carrier is not available.", { status: 400 });
  }

  const adapter = getLogisticsAdapter("internal", { couriers: selectedCouriers });
  return adapter.getRates(toRateInput(input));
}

export async function getAvailableBalance(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("balance_movements")
    .select("amount")
    .eq("user_id", userId)
    .returns<BalanceMovementRow[]>();

  if (error) throw error;
  return Number((data ?? []).reduce((sum, movement) => sum + Number(movement.amount), 0).toFixed(2));
}

export async function createInternalShipment(
  supabase: SupabaseClient,
  userId: string,
  body: CreateInternalShipmentInput,
): Promise<InternalLabelResult> {
  const input = normalizeCreateInput(body);
  validateCreateInput(input);

  const couriers = await getActiveCouriers(supabase);
  const courier = findCourier(couriers, input.courier);
  if (!courier) {
    throw new Response("Selected carrier is not available.", { status: 400 });
  }

  if (input.cashOnDelivery && !courier.permiteContraEntrega) {
    throw new Response("Selected carrier does not support cash on delivery.", { status: 400 });
  }

  const adapter = getLogisticsAdapter("internal", { couriers: [courier] });
  const label = await adapter.createLabel(toCreateLabelInput(input));
  const rate = label.rate;

  const availableBalance = await getAvailableBalance(supabase, userId);
  if (availableBalance < rate.total) {
    throw new Response("Insufficient balance to create this label.", { status: 402 });
  }

  const { data: existingShipment, error: idempotencyError } = await supabase
    .from("shipments")
    .select("*")
    .eq("user_id", userId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle<ShipmentRow>();

  if (idempotencyError && !isMissingSchemaColumnError(idempotencyError)) {
    throw idempotencyError;
  }

  if (existingShipment) {
    const shipment = fromShipmentRow(existingShipment);
    return {
      shipment,
      trackingNumber: shipment.trackingNumber,
      labelStatus: "internal",
      labelUrl: null,
      message: "Existing internal label returned for this idempotency key.",
    };
  }

  const trackingNumber = label.trackingNumber;
  const shipmentRow = {
    id: trackingNumber,
    user_id: userId,
    tracking_number: trackingNumber,
    sender_name: input.senderName,
    sender_phone: input.senderPhone,
    origin_city: input.originCity,
    recipient_name: input.recipientName,
    recipient_phone: input.recipientPhone,
    destination_city: input.destinationCity,
    destination_address: input.destinationAddress,
    weight: input.weight,
    product_type: input.productType,
    courier: courier.nombre,
    shipping_subtotal: rate.shippingSubtotal,
    cash_on_delivery_commission: rate.cashOnDeliveryCommission,
    total: rate.total,
    cash_on_delivery: input.cashOnDelivery,
    cash_amount: input.cashOnDelivery ? input.cashAmount : 0,
    status: "Pendiente" as const,
    value: rate.total,
  };
  const logisticsShipmentFields = {
    payment_status: "paid",
    label_status: "internal",
    provider: rate.provider,
    provider_cost: rate.pricing.providerCost,
    platform_markup: rate.pricing.platformMarkup,
    customer_price: rate.pricing.customerPrice,
    currency: rate.currency,
    payment_fee: rate.pricing.paymentFee,
    pricing_subtotal: rate.pricing.subtotal,
    pricing_model: "shipflow_v1",
    pricing_breakdown: {
      providerCost: rate.pricing.providerCost,
      platformMarkup: rate.pricing.platformMarkup,
      subtotal: rate.pricing.subtotal,
      paymentFee: rate.pricing.paymentFee,
      customerPrice: rate.pricing.customerPrice,
      markupPercentage: rate.pricing.markupPercentage,
      markupMinimum: rate.pricing.markupMinimum,
      paymentFeePercentage: rate.pricing.paymentFeePercentage,
      paymentFeeFixed: rate.pricing.paymentFeeFixed,
    },
    idempotency_key: input.idempotencyKey,
    metadata: {
      source: "internal_web",
      phase: "5.10",
    },
  };

  let { data: shipment, error: shipmentError } = await supabase
    .from("shipments")
    .insert({ ...shipmentRow, ...logisticsShipmentFields })
    .select()
    .single<ShipmentRow>();

  if (shipmentError && isMissingSchemaColumnError(shipmentError)) {
    const legacyResult = await supabase.from("shipments").insert(shipmentRow).select().single<ShipmentRow>();
    shipment = legacyResult.data;
    shipmentError = legacyResult.error;
  }

  if (shipmentError) throw shipmentError;
  if (!shipment) throw new Error("Shipment was not created.");

  const { error: trackingError } = await supabase.from("tracking_events").insert({
    shipment_id: shipment.id,
    user_id: userId,
    tracking_number: shipment.tracking_number,
    title: "Guía creada",
    description: "The shipment was created in ShipFlow.",
    status: shipment.status,
  });

  if (trackingError) throw trackingError;

  const balanceMovementRow = {
    id: `MOV-${crypto.randomUUID()}`,
    user_id: userId,
    concept: `Guía ${shipment.tracking_number}`,
    amount: -rate.total,
  };
  const logisticsBalanceFields = {
    type: "debit",
    reference_type: "shipment",
    reference_id: shipment.id,
    shipment_id: shipment.id,
    idempotency_key: input.idempotencyKey,
    created_by: userId,
    metadata: {
      trackingNumber: shipment.tracking_number,
      source: "internal_web",
      provider: label.provider,
    },
  };

  let { error: movementError } = await supabase
    .from("balance_movements")
    .insert({ ...balanceMovementRow, ...logisticsBalanceFields });

  if (movementError && isMissingSchemaColumnError(movementError)) {
    const legacyMovementResult = await supabase.from("balance_movements").insert(balanceMovementRow);
    movementError = legacyMovementResult.error;
  }

  if (movementError) throw movementError;

  const createdShipment = fromShipmentRow(shipment);
  return {
    shipment: createdShipment,
    trackingNumber: createdShipment.trackingNumber,
    labelStatus: "internal",
    labelUrl: null,
    message: label.message,
  };
}
