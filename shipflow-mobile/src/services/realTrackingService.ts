import type { StandardTrackingStatus, TrackingEvent, TrackingStatus } from "../types";

type TrackingApiResponse = {
  success: boolean;
  data: TrackingStatus | null;
  error: string | null;
};

const statusLabels: Record<StandardTrackingStatus, string> = {
  pendiente: "Pending",
  recolectado: "Accepted",
  en_transito: "In transit",
  en_reparto: "Out for delivery",
  entregado: "Delivered",
  novedad: "Exception",
  devuelto: "Returned",
  cancelado: "Canceled",
};

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeTrackingStatus(rawStatus?: string): StandardTrackingStatus {
  const status = normalizeText(rawStatus ?? "");

  if (status.includes("deliver")) return "entregado";
  if (status.includes("out for delivery") || status.includes("delivery route")) return "en_reparto";
  if (status.includes("transit") || status.includes("route") || status.includes("depart") || status.includes("arriv")) return "en_transito";
  if (status.includes("accepted") || status.includes("pickup") || status.includes("collected")) return "recolectado";
  if (status.includes("exception") || status.includes("failed") || status.includes("hold")) return "novedad";
  if (status.includes("return")) return "devuelto";
  if (status.includes("cancel")) return "cancelado";

  return "pendiente";
}

function fallbackFromSupabaseEvents(
  trackingNumber: string,
  courier: string,
  events: TrackingEvent[],
): TrackingStatus {
  const latest = events.at(-1);
  const status = normalizeTrackingStatus(latest?.status);

  return {
    trackingNumber,
    courier,
    status,
    statusLabel: statusLabels[status],
    currentLocation: "Awaiting carrier update",
    lastUpdate: latest?.date ?? new Date().toISOString(),
    events: events.length
      ? events.map((event) => {
          const eventStatus = normalizeTrackingStatus(event.status);

          return {
            id: event.id,
            title: event.title,
            description: event.description,
            status: eventStatus,
            statusLabel: statusLabels[eventStatus],
            date: event.date,
          };
        })
      : [
          {
            id: `${trackingNumber}-fallback`,
            title: "Label created",
            description: "The shipment exists in ShipFlow. Official carrier tracking has not responded yet.",
            status: "pendiente",
            statusLabel: "Pending",
            location: "ShipFlow",
            date: new Date().toISOString(),
          },
        ],
    source: "fallback",
    isReal: false,
    message: "Temporary simulated information",
  };
}

export async function getRealTracking(
  trackingNumber: string,
  courierName: string | undefined,
  supabaseEvents: TrackingEvent[],
) {
  const endpoint = process.env.EXPO_PUBLIC_TRACKING_API_URL?.trim();
  const courier = courierName || "Unknown carrier";

  if (!endpoint) {
    return fallbackFromSupabaseEvents(trackingNumber, courier, supabaseEvents);
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingNumber, courier }),
    });
    const payload = (await response.json()) as TrackingApiResponse;

    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error ?? "We could not check the carrier.");
    }

    return payload.data;
  } catch {
    return fallbackFromSupabaseEvents(trackingNumber, courier, supabaseEvents);
  }
}
