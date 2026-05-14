import { createHash, timingSafeEqual as cryptoTimingSafeEqual } from "crypto";

// ── Types ──────────────────────────────────────────────────────────────────────

type SSShipment = {
  shipmentId?: number;
  orderId?: number;
  orderNumber?: string;
  orderKey?: string;
  trackingNumber?: string;
  carrierCode?: string;
  serviceCode?: string;
  shipDate?: string;
  shipmentStatus?: string;
  voided?: boolean;
  shipTo?: {
    name?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
};

export type SSFetchedResource = {
  shipments?: SSShipment[];
};

export type NormalizedWebhookEvent = {
  /** SHA-256 of provider:resourceType:resourceUrl — used for deduplication. */
  eventId: string;
  /** Uppercased resource_type from ShipStation (e.g. ITEM_SHIPPED, ORDER_NOTIFY). */
  eventType: string;
  provider: "shipstation";
  trackingNumber: string | null;
  /** ShipStation numeric shipmentId as a string, for use with provider_shipment_id. */
  providerShipmentId: string | null;
  /** orderKey — equals idempotencyKey used when creating the label. */
  orderKey: string | null;
  carrierCode: string | null;
  shipmentStatus: string | null;
  /** shipDate from ShipStation, ISO string if present. */
  eventTimestamp: string | null;
};

// ── Secret validation ──────────────────────────────────────────────────────────

/**
 * Extracts the webhook secret from the request.
 *
 * Priority: custom header → query parameter.
 *
 * ShipStation V1 does not support HMAC signing. Configure your webhook URL in
 * ShipStation dashboard as:
 *   https://yourdomain.com/api/webhooks/shipstation?secret=YOUR_SECRET
 * or send the secret via header x-shipflow-webhook-secret if using a proxy.
 */
export function extractWebhookSecret(request: Request): string | null {
  const headerSecret =
    request.headers.get("x-shipflow-webhook-secret") ??
    request.headers.get("x-shipstation-webhook-secret");
  if (headerSecret?.trim()) return headerSecret.trim();

  try {
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret");
    return querySecret?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Constant-time comparison against SHIPSTATION_WEBHOOK_SECRET.
 * Returns false if the env var is not set — safe-fail, not open.
 */
export function isValidWebhookSecret(provided: string | null): boolean {
  const configured = process.env.SHIPSTATION_WEBHOOK_SECRET?.trim() ?? "";
  if (!configured || !provided) return false;

  const bufA = Buffer.from(provided);
  const bufB = Buffer.from(configured);
  // cryptoTimingSafeEqual requires equal-length buffers.
  if (bufA.length !== bufB.length) return false;
  return cryptoTimingSafeEqual(bufA, bufB);
}

// ── Event ID / deduplication ───────────────────────────────────────────────────

/**
 * Generates a stable, opaque deduplication key for a ShipStation webhook event.
 * Based on the resource_type + resource_url combination (64-char hex).
 */
export function generateEventId(resourceType: string, resourceUrl: string): string {
  return createHash("sha256")
    .update(`shipstation:${resourceType}:${resourceUrl}`)
    .digest("hex")
    .slice(0, 64);
}

// ── ShipStation API fetch ──────────────────────────────────────────────────────

/**
 * Fetches the actual shipment data from the ShipStation resource_url.
 * ShipStation webhooks send a lightweight notification; the real data lives at resource_url.
 * Returns null on any error (auth failure, network issue, missing credentials).
 */
export async function fetchSSResource(resourceUrl: string): Promise<SSFetchedResource | null> {
  const apiKey = process.env.SHIPSTATION_API_KEY?.trim() ?? "";
  const apiSecret = process.env.SHIPSTATION_API_SECRET?.trim() ?? "";
  if (!apiKey) return null;
  if (!resourceUrl.startsWith("https://")) return null;

  try {
    const auth = "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const res = await fetch(resourceUrl, {
      headers: { Authorization: auth, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as SSFetchedResource;
  } catch {
    return null;
  }
}

// ── Event normalization ────────────────────────────────────────────────────────

/**
 * Normalizes a ShipStation webhook event into a flat, typed structure.
 * Defensively handles missing or null fields.
 */
export function normalizeWebhookEvent(
  resourceType: string,
  resourceUrl: string,
  fetched: SSFetchedResource | null,
): NormalizedWebhookEvent {
  const eventType = resourceType.toUpperCase();
  const eventId = generateEventId(eventType, resourceUrl);
  const shipment = fetched?.shipments?.[0];

  return {
    eventId,
    eventType,
    provider: "shipstation",
    trackingNumber: shipment?.trackingNumber ?? null,
    providerShipmentId:
      shipment?.shipmentId != null ? String(shipment.shipmentId) : null,
    orderKey: shipment?.orderKey ?? null,
    carrierCode: shipment?.carrierCode ?? null,
    shipmentStatus: shipment?.shipmentStatus ?? null,
    eventTimestamp: shipment?.shipDate ?? null,
  };
}

// ── Status mapping ─────────────────────────────────────────────────────────────

/**
 * Maps a ShipStation shipmentStatus + eventType to internal ShipFlow statuses.
 *
 * shipments.status uses Spanish strings (consistent with existing app data).
 * shipments.label_status uses the English enum from the migration check constraint.
 */
export function mapSSStatusToInternal(
  ssStatus: string | null,
  eventType: string,
): { shipmentStatus: string | null; labelStatus: string | null } {
  // Infer from event type when no explicit status provided.
  if (!ssStatus) {
    if (eventType === "ITEM_SHIPPED" || eventType === "SHIP_NOTIFY") {
      return { shipmentStatus: "En tránsito", labelStatus: null };
    }
    return { shipmentStatus: null, labelStatus: null };
  }

  switch (ssStatus.toLowerCase()) {
    case "shipped":
    case "in_transit":
      return { shipmentStatus: "En tránsito", labelStatus: null };
    case "delivered":
      return { shipmentStatus: "Entregado", labelStatus: null };
    case "exception":
    case "delivery_exception":
      return { shipmentStatus: "Excepción", labelStatus: null };
    case "voided":
    case "cancelled":
    case "void":
      // Only update label_status for cancelled; don't overwrite a purchased label's status
      // unless the event explicitly says it was voided by SS.
      return { shipmentStatus: "Cancelado", labelStatus: "voided" };
    case "awaiting_shipment":
    case "awaiting_payment":
      return { shipmentStatus: "Pendiente", labelStatus: null };
    default:
      return { shipmentStatus: null, labelStatus: null };
  }
}

/**
 * Returns a human-readable tracking event title for the given ShipStation event.
 */
export function mapEventToTitle(eventType: string, ssStatus: string | null): string {
  if (eventType === "ITEM_SHIPPED" || eventType === "SHIP_NOTIFY") return "En tránsito";
  switch (ssStatus?.toLowerCase()) {
    case "delivered":
      return "Entregado";
    case "exception":
    case "delivery_exception":
      return "Excepción en entrega";
    case "voided":
    case "cancelled":
      return "Cancelado";
    default:
      return "Actualización de envío";
  }
}
