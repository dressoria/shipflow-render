import type { RealTrackingEvent, StandardTrackingStatus, TrackingStatus } from "@/lib/types";

type CourierKey = "usps" | "ups" | "fedex" | "dhl";

type CourierApiPayload = {
  trackingNumber?: string;
  courier?: string;
  status?: string;
  statusLabel?: string;
  currentLocation?: string;
  location?: string;
  lastUpdate?: string;
  updatedAt?: string;
  events?: CourierApiEvent[];
  message?: string;
};

type CourierApiEvent = {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  statusLabel?: string;
  location?: string;
  date?: string;
  createdAt?: string;
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

const courierConfig: Record<CourierKey, { displayName: string; endpointKeys: string[]; tokenKeys: string[] }> = {
  usps: {
    displayName: "USPS",
    endpointKeys: ["USPS_API_URL", "USPS_TRACKING_API_URL"],
    tokenKeys: ["USPS_API_KEY", "USPS_TRACKING_API_KEY"],
  },
  ups: {
    displayName: "UPS",
    endpointKeys: ["UPS_API_URL", "UPS_TRACKING_API_URL"],
    tokenKeys: ["UPS_API_KEY", "UPS_TRACKING_API_KEY"],
  },
  fedex: {
    displayName: "FedEx",
    endpointKeys: ["FEDEX_API_URL", "FEDEX_TRACKING_API_URL"],
    tokenKeys: ["FEDEX_API_KEY", "FEDEX_TRACKING_API_KEY"],
  },
  dhl: {
    displayName: "DHL",
    endpointKeys: ["DHL_API_URL", "DHL_TRACKING_API_URL"],
    tokenKeys: ["DHL_API_KEY", "DHL_TRACKING_API_KEY"],
  },
};

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeCourierName(courierName?: string): CourierKey | "unknown" {
  const value = normalizeText(courierName ?? "");
  if (value.includes("usps") || value.includes("postal")) return "usps";
  if (value.includes("ups")) return "ups";
  if (value.includes("fedex") || value.includes("federal express")) return "fedex";
  if (value.includes("dhl")) return "dhl";
  return "unknown";
}

export function normalizeTrackingStatus(rawStatus?: string): StandardTrackingStatus {
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

function readFirstEnv(keys: string[]) {
  return keys.map((key) => process.env[key]?.trim()).find(Boolean);
}

function buildTrackingResult(
  trackingNumber: string,
  courier: string,
  payload: CourierApiPayload,
  options: { isReal: boolean; source: string },
): TrackingStatus {
  const rawStatus = payload.status ?? payload.statusLabel;
  const status = normalizeTrackingStatus(rawStatus);
  const rawEvents = payload.events ?? [];
  const events = rawEvents.map<RealTrackingEvent>((event, index) => {
    const eventStatus = normalizeTrackingStatus(event.status ?? event.statusLabel ?? rawStatus);
    const statusLabel = event.statusLabel ?? statusLabels[eventStatus];

    return {
      id: event.id ?? `${trackingNumber}-${index}`,
      title: event.title ?? statusLabel,
      description: event.description,
      status: eventStatus,
      statusLabel,
      location: event.location,
      date: event.date ?? event.createdAt,
    };
  });

  return {
    trackingNumber: payload.trackingNumber ?? trackingNumber,
    courier: payload.courier ?? courier,
    status,
    statusLabel: payload.statusLabel ?? statusLabels[status],
    currentLocation: payload.currentLocation ?? payload.location ?? events.at(-1)?.location,
    lastUpdate: payload.lastUpdate ?? payload.updatedAt ?? events.at(-1)?.date,
    events,
    source: options.source,
    isReal: options.isReal,
    message: payload.message,
  };
}

function buildFallbackTracking(trackingNumber: string, courier: string): TrackingStatus {
  const now = new Date().toISOString();

  return buildTrackingResult(
    trackingNumber,
    courier,
    {
      status: "Pending",
      currentLocation: "Awaiting carrier update",
      lastUpdate: now,
      events: [
        {
          id: `${trackingNumber}-fallback-created`,
          title: "Label created",
          description: "The shipment exists in ShipFlow. Official carrier tracking has not responded yet.",
          status: "Pending",
          statusLabel: "Pending",
          location: "ShipFlow",
          date: now,
        },
      ],
      message: "Temporary simulated information. Configure the official carrier API for live tracking.",
    },
    { isReal: false, source: "fallback" },
  );
}

async function getOfficialApiTracking(trackingNumber: string, courierKey: CourierKey) {
  const config = courierConfig[courierKey];
  const endpoint = readFirstEnv(config.endpointKeys);
  if (!endpoint) return buildFallbackTracking(trackingNumber, config.displayName);

  const url = new URL(endpoint);
  url.searchParams.set("trackingNumber", trackingNumber);

  // TODO: Adjust headers, query params, and signatures for each official carrier API.
  const token = readFirstEnv(config.tokenKeys);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`${config.displayName} responded with status ${response.status}.`);
  }

  const payload = (await response.json()) as CourierApiPayload;
  return buildTrackingResult(trackingNumber, config.displayName, payload, {
    isReal: true,
    source: config.displayName,
  });
}

export async function getUspsTracking(trackingNumber: string) {
  return getOfficialApiTracking(trackingNumber, "usps");
}

export async function getUpsTracking(trackingNumber: string) {
  return getOfficialApiTracking(trackingNumber, "ups");
}

export async function getFedexTracking(trackingNumber: string) {
  return getOfficialApiTracking(trackingNumber, "fedex");
}

export async function getDhlTracking(trackingNumber: string) {
  return getOfficialApiTracking(trackingNumber, "dhl");
}

export async function getRealTracking(trackingNumber: string, courierName?: string) {
  const courier = normalizeCourierName(courierName);

  if (courier === "usps") return getUspsTracking(trackingNumber);
  if (courier === "ups") return getUpsTracking(trackingNumber);
  if (courier === "fedex") return getFedexTracking(trackingNumber);
  if (courier === "dhl") return getDhlTracking(trackingNumber);

  return buildFallbackTracking(trackingNumber, courierName || "Unknown carrier");
}
