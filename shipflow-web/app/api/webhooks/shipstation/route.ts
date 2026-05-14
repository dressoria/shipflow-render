import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractWebhookSecret,
  fetchSSResource,
  isValidWebhookSecret,
  mapEventToTitle,
  mapSSStatusToInternal,
  normalizeWebhookEvent,
  type NormalizedWebhookEvent,
} from "@/lib/server/webhooks/shipstation";
import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import {
  createServiceSupabaseClient,
  isServerSupabaseConfigured,
  isServiceRoleConfigured,
} from "@/lib/server/supabaseServer";

// ── POST /api/webhooks/shipstation ─────────────────────────────────────────────
//
// Receives ShipStation webhook events.
// ShipStation sends: { resource_url: "...", resource_type: "ITEM_SHIPPED" }
// We fetch the actual data from resource_url, then persist and process the event.
//
// Authentication: secret via ?secret= query param or x-shipflow-webhook-secret header.
// No user Bearer token is expected or accepted.
//
// docs/SHIPSTATION_WEBHOOK_TEST_CHECKLIST.md has setup and test instructions.

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Service not configured.", 503);
  }

  // Validate webhook secret before touching the body.
  const secret = extractWebhookSecret(request);
  if (!isValidWebhookSecret(secret)) {
    return apiError("Unauthorized.", 401);
  }

  // Parse JSON body defensively.
  let rawPayload: Record<string, unknown>;
  try {
    rawPayload = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError("Invalid JSON payload.", 400);
  }

  const resourceType =
    typeof rawPayload.resource_type === "string" ? rawPayload.resource_type.trim() : "";
  const resourceUrl =
    typeof rawPayload.resource_url === "string" ? rawPayload.resource_url.trim() : "";

  if (!resourceType) {
    return apiError("Missing resource_type.", 400);
  }

  // Fetch detailed shipment data from ShipStation resource URL.
  // If SHIPSTATION_API_KEY is not set or fetch fails, fetched will be null
  // and we still process with the data we have.
  const fetched = resourceUrl ? await fetchSSResource(resourceUrl) : null;

  // Normalize into a flat, typed structure.
  const event = normalizeWebhookEvent(resourceType, resourceUrl, fetched);

  // Service role is required for all DB operations — webhooks bypass user RLS.
  if (!isServiceRoleConfigured) {
    // Return 200 to prevent ShipStation from retrying forever.
    // Operator must configure SUPABASE_SERVICE_ROLE_KEY.
    console.error(
      "[webhook/shipstation] SUPABASE_SERVICE_ROLE_KEY is not configured. " +
        "Webhook received but cannot be persisted. See docs/SECURITY.md.",
    );
    return apiSuccess({ received: true, processed: false });
  }

  const svc = createServiceSupabaseClient();

  // Deduplication: reject events we have already seen (idempotency).
  const { data: existing } = await svc
    .from("webhook_events")
    .select("id, status")
    .eq("provider", "shipstation")
    .eq("event_id", event.eventId)
    .maybeSingle();

  if (existing) {
    const existingStatus = (existing as Record<string, unknown>).status as string | null;
    return apiSuccess({ received: true, duplicate: true, status: existingStatus });
  }

  // Store a sanitized payload (omit resource_url — it contains SS credentials in query params
  // and is large; the key facts are extracted into the event fields above).
  const storedPayload: Record<string, unknown> = {
    resource_type: event.eventType,
    tracking_number: event.trackingNumber,
    provider_shipment_id: event.providerShipmentId,
    order_key: event.orderKey,
    carrier_code: event.carrierCode,
    shipment_status: event.shipmentStatus,
    fetched_ok: fetched !== null,
  };

  // Insert webhook event record (status = received). We update it as we process.
  const { data: webhookRecord, error: insertErr } = await svc
    .from("webhook_events")
    .insert({
      provider: "shipstation",
      event_id: event.eventId,
      event_type: event.eventType,
      tracking_number: event.trackingNumber,
      payload: storedPayload,
      status: "received",
    })
    .select("id")
    .single();

  if (insertErr || !webhookRecord) {
    // Most likely a race condition where a concurrent request inserted first.
    // Return 200 to prevent ShipStation retries.
    console.error("[webhook/shipstation] Insert failed:", insertErr?.message);
    return apiSuccess({ received: true, processed: false });
  }

  const webhookId = String((webhookRecord as Record<string, unknown>).id);

  // Process: find related shipment, update status, insert tracking event.
  try {
    await processEvent(svc, webhookId, event);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown processing error";
    console.error("[webhook/shipstation] Processing error:", msg);
    await svc
      .from("webhook_events")
      .update({ status: "failed", error: msg.slice(0, 500) })
      .eq("id", webhookId);
  }

  return apiSuccess({ received: true, processed: true });
}

// ── Event processing ───────────────────────────────────────────────────────────

type ShipmentLookup = {
  id: string;
  user_id: string;
  tracking_number: string | null;
  label_status: string | null;
};

async function findShipment(
  svc: SupabaseClient,
  event: NormalizedWebhookEvent,
): Promise<ShipmentLookup | null> {
  const select = "id, user_id, tracking_number, label_status";

  if (event.providerShipmentId) {
    const { data } = await svc
      .from("shipments")
      .select(select)
      .eq("provider", "shipstation")
      .eq("provider_shipment_id", event.providerShipmentId)
      .maybeSingle();
    if (data) return data as ShipmentLookup;
  }

  if (event.trackingNumber) {
    const { data } = await svc
      .from("shipments")
      .select(select)
      .eq("tracking_number", event.trackingNumber)
      .maybeSingle();
    if (data) return data as ShipmentLookup;
  }

  // orderKey = idempotencyKey used at label creation time.
  if (event.orderKey) {
    const { data } = await svc
      .from("shipments")
      .select(select)
      .eq("provider", "shipstation")
      .eq("idempotency_key", event.orderKey)
      .maybeSingle();
    if (data) return data as ShipmentLookup;
  }

  return null;
}

async function processEvent(
  svc: SupabaseClient,
  webhookId: string,
  event: NormalizedWebhookEvent,
): Promise<void> {
  const shipment = await findShipment(svc, event);

  if (!shipment) {
    // No matching shipment — could be a ShipStation test event or a shipment created outside
    // this platform. Mark as processed so it doesn't clog the failed queue.
    await svc
      .from("webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("id", webhookId);
    return;
  }

  // Map ShipStation status to internal fields.
  const { shipmentStatus, labelStatus } = mapSSStatusToInternal(
    event.shipmentStatus,
    event.eventType,
  );

  // Build shipment updates — only set fields that have meaningful new values.
  const shipmentUpdate: Record<string, string> = {};
  if (shipmentStatus) shipmentUpdate.status = shipmentStatus;

  // Don't downgrade a voided label back to another status via webhook race condition.
  if (labelStatus && shipment.label_status !== "voided") {
    shipmentUpdate.label_status = labelStatus;
  }

  if (Object.keys(shipmentUpdate).length > 0) {
    await svc.from("shipments").update(shipmentUpdate).eq("id", shipment.id);
  }

  // Link this webhook event to the resolved shipment.
  await svc.from("webhook_events").update({ shipment_id: shipment.id }).eq("id", webhookId);

  // Insert tracking event (deduplicated by shipment + source + status).
  const trackingNumber = event.trackingNumber ?? shipment.tracking_number ?? "";
  const title = mapEventToTitle(event.eventType, event.shipmentStatus);
  const statusValue = shipmentStatus ?? event.eventType;

  const { data: existingTracking } = await svc
    .from("tracking_events")
    .select("id")
    .eq("shipment_id", shipment.id)
    .eq("source", "shipstation_webhook")
    .eq("status", statusValue)
    .maybeSingle();

  if (!existingTracking) {
    await svc.from("tracking_events").insert({
      shipment_id: shipment.id,
      user_id: shipment.user_id,
      tracking_number: trackingNumber,
      title,
      description: `ShipStation ${event.eventType}${event.shipmentStatus ? `: ${event.shipmentStatus}` : ""}`,
      status: statusValue,
      courier: event.carrierCode ?? null,
      source: "shipstation_webhook",
      is_real: true,
      event_date: event.eventTimestamp
        ? new Date(event.eventTimestamp).toISOString()
        : new Date().toISOString(),
    });
  }

  // Mark webhook event as fully processed.
  await svc
    .from("webhook_events")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("id", webhookId);
}
