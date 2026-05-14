import { NextResponse } from "next/server";
import { calculateShippingRate } from "@/lib/services/courierService";
import { isServerSupabaseConfigured, requireSupabaseUser } from "@/lib/server/supabaseServer";
import type { CourierConfig, Envio } from "@/lib/types";

type CreateShipmentRequest = {
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

type ShipmentRow = {
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
  status: Envio["status"];
  value: number;
  payment_status?: string;
  label_status?: string;
  provider_cost?: number | null;
  platform_markup?: number;
  customer_price?: number | null;
  currency?: string;
  idempotency_key?: string | null;
  created_at: string;
};

type BalanceMovementRow = {
  amount: number;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, data: null, error: message }, { status });
}

function isMissingSchemaColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "42703" ||
    candidate.code === "PGRST204" ||
    candidate.message?.toLowerCase().includes("column") ||
    false
  );
}

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

function fromShipmentRow(row: ShipmentRow): Envio {
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
  };
}

function createTrackingNumber() {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `SF-${timePart}-${randomPart}`;
}

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return jsonError("Supabase is not configured on the server.", 503);
  }

  try {
    const { supabase, user } = await requireSupabaseUser(request);
    const body = (await request.json()) as CreateShipmentRequest;

    const input = {
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
      return jsonError("Complete all required shipment fields.", 400);
    }

    if (!Number.isFinite(input.weight) || input.weight <= 0) {
      return jsonError("Enter a valid package weight.", 400);
    }

    if (input.cashOnDelivery && (!Number.isFinite(input.cashAmount) || input.cashAmount <= 0)) {
      return jsonError("Enter a valid cash on delivery amount.", 400);
    }

    const { data: courierRows, error: courierError } = await supabase
      .from("couriers")
      .select("*")
      .returns<CourierRow[]>();

    if (courierError) throw courierError;

    const courier =
      courierRows
        ?.map(fromCourierRow)
        .find((item) => item.id === input.courier || item.nombre === input.courier) ?? null;
    if (!courier || !courier.activo) {
      return jsonError("Selected carrier is not available.", 400);
    }

    if (input.cashOnDelivery && !courier.permiteContraEntrega) {
      return jsonError("Selected carrier does not support cash on delivery.", 400);
    }

    const rate = calculateShippingRate({
      courier,
      peso: input.weight,
      ciudadOrigen: input.originCity,
      ciudadDestino: input.destinationCity,
      contraEntrega: input.cashOnDelivery,
      valorCobrar: input.cashAmount,
    });

    const { data: movementRows, error: balanceError } = await supabase
      .from("balance_movements")
      .select("amount")
      .returns<BalanceMovementRow[]>();

    if (balanceError) throw balanceError;

    const availableBalance = Number(
      (movementRows ?? []).reduce((sum, movement) => sum + Number(movement.amount), 0).toFixed(2),
    );

    if (availableBalance < rate.total) {
      return jsonError("Insufficient balance to create this label.", 402);
    }

    if (input.idempotencyKey) {
      const { data: existingShipment, error: idempotencyError } = await supabase
        .from("shipments")
        .select("*")
        .eq("user_id", user.id)
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle<ShipmentRow>();

      if (idempotencyError && !isMissingSchemaColumnError(idempotencyError)) {
        throw idempotencyError;
      }

      if (existingShipment) {
        return NextResponse.json({
          success: true,
          data: fromShipmentRow(existingShipment),
          error: null,
        });
      }
    }

    const trackingNumber = createTrackingNumber();
    const shipmentRow = {
      id: trackingNumber,
      user_id: user.id,
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
      shipping_subtotal: rate.subtotal,
      cash_on_delivery_commission: rate.contraEntregaComision,
      total: rate.total,
      cash_on_delivery: input.cashOnDelivery,
      cash_amount: input.cashOnDelivery ? input.cashAmount : 0,
      status: "Pendiente" as const,
      value: rate.total,
    };
    const logisticsShipmentFields = {
      payment_status: "paid",
      label_status: "internal",
      provider_cost: null,
      platform_markup: 0,
      customer_price: rate.total,
      currency: "USD",
      idempotency_key: input.idempotencyKey,
      metadata: {
        source: "internal_web",
        phase: "1C",
      },
    };

    let { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .insert({ ...shipmentRow, ...logisticsShipmentFields })
      .select()
      .single<ShipmentRow>();

    if (shipmentError && isMissingSchemaColumnError(shipmentError)) {
      const legacyResult = await supabase
        .from("shipments")
        .insert(shipmentRow)
        .select()
        .single<ShipmentRow>();

      shipment = legacyResult.data;
      shipmentError = legacyResult.error;
    }

    if (shipmentError) throw shipmentError;
    if (!shipment) throw new Error("Shipment was not created.");

    const { error: trackingError } = await supabase.from("tracking_events").insert({
      shipment_id: shipment.id,
      user_id: user.id,
      tracking_number: shipment.tracking_number,
      title: "Guía creada",
      description: "The shipment was created in ShipFlow.",
      status: shipment.status,
    });

    if (trackingError) throw trackingError;

    const balanceMovementRow = {
      id: `MOV-${crypto.randomUUID()}`,
      user_id: user.id,
      concept: `Guía ${shipment.tracking_number}`,
      amount: -rate.total,
    };
    const logisticsBalanceFields = {
      type: "debit",
      reference_type: "shipment",
      reference_id: shipment.id,
      shipment_id: shipment.id,
      idempotency_key: input.idempotencyKey,
      created_by: user.id,
      metadata: {
        trackingNumber: shipment.tracking_number,
        source: "internal_web",
      },
    };

    let { error: movementError } = await supabase
      .from("balance_movements")
      .insert({ ...balanceMovementRow, ...logisticsBalanceFields });

    if (movementError && isMissingSchemaColumnError(movementError)) {
      const legacyMovementResult = await supabase
        .from("balance_movements")
        .insert(balanceMovementRow);

      movementError = legacyMovementResult.error;
    }

    if (movementError) throw movementError;

    return NextResponse.json({
      success: true,
      data: fromShipmentRow(shipment),
      error: null,
    });
  } catch (error) {
    if (error instanceof Response) {
      return jsonError((await error.text()) || "Unauthorized.", error.status);
    }

    return jsonError(
      error instanceof Error ? error.message : "We could not create this label.",
      500,
    );
  }
}
