import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { findShipment, getShipments as getLocalShipments, saveShipment } from "@/lib/storage";
import { apiGetShipments } from "@/lib/services/apiClient";
import type { Envio } from "@/lib/types";

export async function createShipment(shipment: Envio): Promise<Envio> {
  if (isSupabaseConfigured && supabase) {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error("Your session expired. Please sign in again.");
    }

    const response = await fetch("/api/labels", {
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
      data: { shipment: Envio } | null;
      error: string | null;
    };

    if (!response.ok || !payload.success || !payload.data?.shipment) {
      throw new Error(payload.error ?? "We could not create this label.");
    }

    return payload.data.shipment;
  }

  saveShipment(shipment);
  return shipment;
}

export async function getShipments(): Promise<Envio[]> {
  if (isSupabaseConfigured) {
    const result = await apiGetShipments({ limit: 50 });
    return result.shipments;
  }

  return getLocalShipments();
}

export async function getShipmentByTrackingNumber(trackingNumber: string): Promise<Envio | null> {
  if (isSupabaseConfigured) {
    const result = await apiGetShipments({ tracking_number: trackingNumber.trim(), limit: 1 });
    return result.shipments[0] ?? null;
  }

  return findShipment(trackingNumber) ?? null;
}
