import type { Shipment, ShipmentStatus } from "../types";
import { supabase } from "./supabase";

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
  status: ShipmentStatus;
  value: number;
  created_at: string;
};

function fromRow(row: ShipmentRow): Shipment {
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

export async function getShipments() {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ShipmentRow[]>();

  if (error) throw error;
  return data.map(fromRow);
}

export async function getShipmentByTrackingNumber(trackingNumber: string) {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("tracking_number", trackingNumber.trim())
    .maybeSingle<ShipmentRow>();

  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function createShipment(input: Omit<Shipment, "date">) {
  const row = {
    id: input.id,
    tracking_number: input.trackingNumber,
    sender_name: input.senderName,
    sender_phone: input.senderPhone,
    origin_city: input.originCity,
    recipient_name: input.recipientName,
    recipient_phone: input.recipientPhone,
    destination_city: input.destinationCity,
    destination_address: input.destinationAddress,
    weight: input.weight,
    product_type: input.productType,
    courier: input.courier,
    shipping_subtotal: input.shippingSubtotal,
    cash_on_delivery_commission: input.cashOnDeliveryCommission,
    total: input.total,
    cash_on_delivery: input.cashOnDelivery,
    cash_amount: input.cashAmount,
    status: input.status,
    value: input.value,
  };
  const { data, error } = await supabase.from("shipments").insert(row).select().single<ShipmentRow>();
  if (error) throw error;

  await supabase.from("tracking_events").insert({
    shipment_id: data.id,
    tracking_number: data.tracking_number,
    title: "Label created",
    description: "The shipment was created from the mobile app.",
    status: data.status,
  });

  await supabase.from("balance_movements").insert({
    id: `MOV-${Date.now()}`,
    concept: `Label ${data.tracking_number}`,
    amount: -Number(data.value),
  });

  return fromRow(data);
}
