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

function toRow(shipment: Envio): Omit<ShipmentRow, "created_at"> {
  return {
    id: shipment.id,
    user_id: shipment.userId,
    tracking_number: shipment.trackingNumber,
    sender_name: shipment.senderName,
    sender_phone: shipment.senderPhone,
    origin_city: shipment.originCity,
    recipient_name: shipment.recipientName,
    recipient_phone: shipment.recipientPhone,
    destination_city: shipment.destinationCity,
    destination_address: shipment.destinationAddress,
    weight: shipment.weight,
    product_type: shipment.productType,
    courier: shipment.courier,
    shipping_subtotal: shipment.shippingSubtotal,
    cash_on_delivery_commission: shipment.cashOnDeliveryCommission,
    total: shipment.total,
    cash_on_delivery: shipment.cashOnDelivery,
    cash_amount: shipment.cashAmount,
    status: shipment.status,
    value: shipment.value,
  };
}

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
    const { data, error } = await supabase
      .from("shipments")
      .insert(toRow(shipment))
      .select()
      .single<ShipmentRow>();

    if (error) throw error;
    await supabase.from("tracking_events").insert({
      shipment_id: data.id,
      tracking_number: data.tracking_number,
      title: "Guía creada",
      description: "The shipment was created in ShipFlow.",
      status: data.status,
    });
    await supabase.from("balance_movements").insert({
      id: `MOV-${Date.now()}`,
      concept: `Guía ${shipment.trackingNumber}`,
      amount: -shipment.value,
    });
    return fromRow(data);
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
