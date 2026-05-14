import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { findShipment, getShipments as getLocalShipments, saveShipment } from "@/lib/storage";
import type { Envio } from "@/lib/types";

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
  created_at: string;
};

function fromRow(row: ShipmentRow): Envio {
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
    weight: row.weight,
    productType: row.product_type,
    courier: row.courier,
    shippingSubtotal: row.shipping_subtotal ?? row.value,
    cashOnDeliveryCommission: row.cash_on_delivery_commission ?? 0,
    total: row.total ?? row.value,
    cashOnDelivery: row.cash_on_delivery,
    cashAmount: row.cash_amount,
    status: row.status,
    value: row.value,
    date: row.created_at,
  };
}

export async function createShipment(shipment: Envio): Promise<Envio> {
  if (isSupabaseConfigured && supabase) {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error("Your session expired. Please sign in again.");
    }

    const response = await fetch("/api/shipments/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        senderName: shipment.senderName,
        senderPhone: shipment.senderPhone,
        originCity: shipment.originCity,
        recipientName: shipment.recipientName,
        recipientPhone: shipment.recipientPhone,
        destinationCity: shipment.destinationCity,
        destinationAddress: shipment.destinationAddress,
        weight: shipment.weight,
        productType: shipment.productType,
        courier: shipment.courier,
        cashOnDelivery: shipment.cashOnDelivery,
        cashAmount: shipment.cashAmount,
        idempotencyKey: crypto.randomUUID(),
      }),
    });

    const payload = (await response.json()) as {
      success: boolean;
      data: Envio | null;
      error: string | null;
    };

    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error ?? "We could not create this label.");
    }

    return payload.data;
  }

  saveShipment(shipment);
  return shipment;
}

export async function getShipments(): Promise<Envio[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<ShipmentRow[]>();

    if (error) throw error;
    return data.map(fromRow);
  }

  return getLocalShipments();
}

export async function getShipmentByTrackingNumber(trackingNumber: string): Promise<Envio | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .eq("tracking_number", trackingNumber.trim())
      .maybeSingle<ShipmentRow>();

    if (error) throw error;
    return data ? fromRow(data) : null;
  }

  return findShipment(trackingNumber) ?? null;
}
