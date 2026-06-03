import type { EcuadorShipmentStatus } from "@/lib/ecuador/types";

const DELIVEREO_STATUS_MAP: Record<string, EcuadorShipmentStatus> = {
  CREATED: "provider_pending",
  PENDING: "provider_pending",
  ASSIGNED: "pickup_scheduled",
  PICKED_UP: "picked_up",
  IN_TRANSIT: "in_transit",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  FAILED: "failed",
};

export function normalizeProviderStatus(provider: string, providerStatus: string | null | undefined): EcuadorShipmentStatus {
  const normalizedProvider = provider.trim().toLowerCase();
  const normalizedStatus = providerStatus?.trim().toUpperCase() ?? "";

  if (normalizedProvider === "delivereo") {
    return DELIVEREO_STATUS_MAP[normalizedStatus] ?? "action_required";
  }

  if (normalizedProvider === "mock" || normalizedProvider === "manual") {
    return "quote_requested";
  }

  return "action_required";
}
