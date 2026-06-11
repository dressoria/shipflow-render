// FASE 5.40B — Server-side label purchase processor for pending_label_orders.
//
// Entry point: purchaseLabelForPendingOrder(orderId)
//
// Safety invariants:
//   - Only runs when ENABLE_REAL_LABEL_PURCHASE=true.
//   - Only processes paid_waiting_label_purchase, or explicit admin retries from clean action_required.
//   - Order must have paid_at and stripe_payment_intent_id set.
//   - Idempotent: label_purchased orders return immediately without re-purchasing.
//   - On provider failure (after payment confirmed): order marked refund_needed.
//   - On snapshot/rate validation failure: order marked action_required.
//   - On DB persist failure after label purchased: reconciliation event + action_required.
//   - NO wallet debit — user already paid via Stripe.
//   - Only shipstation/ShipEngine provider supports labels in this phase.

import { createServiceSupabaseClient } from "@/lib/server/supabaseServer";
import { getLogisticsAdapter } from "@/lib/logistics/registry";
import { ShipEngineLabelAdapter } from "@/lib/logistics/adapters/ShipEngineLabelAdapter";
import {
  MEDIA_MAIL_ACTION_REQUIRED_MESSAGE,
  RATE_EXPIRED_ACTION_REQUIRED_MESSAGE,
  shouldBlockMediaMailRate,
} from "@/lib/logistics/mediaMail";
import { calculateCustomerPrice } from "@/lib/logistics/pricing";
import {
  getPendingLabelOrderByIdForAdmin,
  claimPendingLabelOrderForPurchase,
  markPendingLabelOrderLabelPurchased,
  markPendingLabelOrderActionRequired,
  markPendingLabelOrderRefundNeeded,
} from "@/lib/server/pendingLabelOrders";
import { createAuditLog, createReconciliationEvent } from "@/lib/server/auditLog";
import { canPurchaseRealLabelForUserId } from "@/lib/server/featureGates";
import { validateDomesticShipmentCountries } from "@/lib/domesticMarkets";
import type {
  PendingLabelOrder,
  PendingLabelOrderParcel,
  StructuredAddress,
} from "@/lib/types";
import type {
  Address,
  CreateLabelInput,
  LabelResult,
  Parcel,
  RateResult,
} from "@/lib/logistics/types";

type PersistedShipmentResult = {
  shipmentId: string;
  trackingNumber: string;
};

export type LabelPurchaseResult = {
  orderId: string;
  shipmentId: string;
  trackingNumber: string;
  labelUrl: string | null;
  providerLabelId: string | null;
  providerShipmentId: string | null;
};

function toLogisticsAddress(addr: StructuredAddress): Address {
  return {
    name: addr.name,
    phone: addr.phone,
    line1: addr.street1,
    line2: addr.street2,
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    country: addr.country || "US",
  };
}

function toLogisticsParcel(parcel: PendingLabelOrderParcel): Parcel {
  return {
    weight: parcel.weight,
    // PendingLabelOrderParcel allows "g" but logistics Parcel only supports lb/oz/kg.
    // "g" is blocked in validateOrderSnapshots before this is called.
    weightUnit: parcel.weightUnit as "lb" | "oz" | "kg",
    length: parcel.length,
    width: parcel.width,
    height: parcel.height,
    dimensionUnit: parcel.dimensionUnit as "in" | "cm",
  };
}

// Validates all required fields in the rate/address/parcel snapshots.
// Throws with a clear message if any field is missing or invalid.
// This must be called before calling the provider — prevents partial provider calls.
export function validateOrderSnapshots(order: PendingLabelOrder): void {
  const rs = order.rateSnapshot;
  if (!rs?.provider?.trim()) throw new Error("Invalid rate snapshot: missing provider.");
  if (!rs.serviceCode?.trim()) throw new Error("Invalid rate snapshot: missing serviceCode.");
  if (!rs.carrierCode?.trim()) throw new Error("Invalid rate snapshot: missing carrierCode.");
  if (!rs.customerPrice || rs.customerPrice <= 0) {
    throw new Error("Invalid rate snapshot: customerPrice must be positive.");
  }
  if (!rs.currency?.trim()) throw new Error("Invalid rate snapshot: missing currency.");
  if (rs.currency.trim().toUpperCase() !== "USD") {
    throw new Error("Invalid rate snapshot: only USD rates are supported right now.");
  }

  const o = order.origin;
  if (!o?.street1?.trim()) throw new Error("Invalid origin: street1 is required.");
  if (!o.city?.trim()) throw new Error("Invalid origin: city is required.");
  if (!o.state?.trim()) throw new Error("Invalid origin: state is required.");
  if (!o.postalCode?.trim()) throw new Error("Invalid origin: postalCode is required.");

  const d = order.destination;
  if (!d?.street1?.trim()) throw new Error("Invalid destination: street1 is required.");
  if (!d.city?.trim()) throw new Error("Invalid destination: city is required.");
  if (!d.state?.trim()) throw new Error("Invalid destination: state is required.");
  if (!d.postalCode?.trim()) throw new Error("Invalid destination: postalCode is required.");
  validateDomesticShipmentCountries(o, d);

  const p = order.parcel;
  if (!p || !Number.isFinite(p.weight) || p.weight <= 0) {
    throw new Error("Invalid parcel: weight must be a positive number.");
  }
  if (!Number.isFinite(p.length) || p.length <= 0) {
    throw new Error("Invalid parcel: length must be a positive number.");
  }
  if (!Number.isFinite(p.width) || p.width <= 0) {
    throw new Error("Invalid parcel: width must be a positive number.");
  }
  if (!Number.isFinite(p.height) || p.height <= 0) {
    throw new Error("Invalid parcel: height must be a positive number.");
  }
  if (!p.weightUnit || !["lb", "oz", "kg"].includes(p.weightUnit)) {
    throw new Error(
      `Invalid parcel: weightUnit must be lb, oz, or kg (got '${p.weightUnit ?? "none"}').`,
    );
  }
}

// Re-fetches live rates from the provider to get a fresh providerRateId.
// Rate IDs expire (ShipEngine rates are short-lived). We match by providerRateId first,
// then fall back to carrierCode + serviceCode from the snapshot.
async function revalidateRateForOrder(order: PendingLabelOrder): Promise<RateResult> {
  const adapter = getLogisticsAdapter(order.rateSnapshot.provider);
  const origin = toLogisticsAddress(order.origin);
  const destination = toLogisticsAddress(order.destination);
  const parcel = toLogisticsParcel(order.parcel);

  const rates = await adapter.getRates({ origin, destination, parcel });

  const snapshotRateId = order.rateSnapshot.providerRateId;
  const snapshotCarrier = order.rateSnapshot.carrierCode;
  const snapshotService = order.rateSnapshot.serviceCode;

  const exact = snapshotRateId
    ? rates.find((r) => r.providerRateId === snapshotRateId)
    : undefined;

  const compatible = rates.find(
    (r) => r.courierId === snapshotCarrier && r.serviceCode === snapshotService,
  );

  const selected = exact ?? compatible;
  if (!selected?.providerRateId) {
    throw new Error(
      `Rate no longer available: carrier=${snapshotCarrier}, service=${snapshotService}. ` +
        `The rate may have expired. Try again or mark action_required.`,
    );
  }
  return selected;
}

function buildLabelInput(
  order: PendingLabelOrder,
  revalidatedRate: RateResult,
): CreateLabelInput {
  const idempotencyKey = order.idempotencyKey ?? `label-purchase-${order.id}`;
  return {
    origin: toLogisticsAddress(order.origin),
    destination: toLogisticsAddress(order.destination),
    parcel: toLogisticsParcel(order.parcel),
    provider: order.rateSnapshot.provider as CreateLabelInput["provider"],
    providerRateId: revalidatedRate.providerRateId,
    serviceCode: revalidatedRate.serviceCode,
    carrierCode: revalidatedRate.courierId,
    idempotencyKey,
    labelFormat: "pdf",
    senderName: order.origin.name,
    senderPhone: order.origin.phone,
    recipientName: order.destination.name,
    recipientPhone: order.destination.phone,
    revalidatedRate,
  };
}

export function isPlaceholderTrackingNumber(trackingNumber: string): boolean {
  const normalized = trackingNumber.trim().toUpperCase();
  if (!normalized) return false;

  if (normalized === "1ZXXXXXXXXXXXXXXXX") return true;
  if (/TRACKING\s+NUMBER.*HERE/.test(normalized)) return true;
  if (/X{8,}/.test(normalized)) return true;

  return false;
}

function buildInternalTrackingCandidates(providerTrackingNumber: string, orderId: string): string[] {
  const idParts = orderId.split("-").filter(Boolean);
  const compactId = orderId.replace(/-/g, "");
  const firstSuffix = idParts[0] ?? compactId.slice(0, 8);
  const secondSuffix = idParts[1] ?? compactId.slice(8, 12);

  return [
    `${providerTrackingNumber}-${firstSuffix}`,
    `${providerTrackingNumber}-${firstSuffix}-${secondSuffix}`,
    `${providerTrackingNumber}-${compactId.slice(0, 16)}`,
  ];
}

async function resolveTrackingNumberForShipment(
  serviceSupabase: ReturnType<typeof createServiceSupabaseClient>,
  order: PendingLabelOrder,
  providerTrackingNumber: string,
): Promise<{
  trackingNumber: string;
  providerTrackingNumberOriginal?: string;
  wasPlaceholder: boolean;
  usedInternalFallback: boolean;
}> {
  const wasPlaceholder = isPlaceholderTrackingNumber(providerTrackingNumber);
  const { data: existingProviderTracking, error: existingProviderTrackingError } =
    await serviceSupabase
      .from("shipments")
      .select("id")
      .eq("tracking_number", providerTrackingNumber)
      .maybeSingle<{ id: string }>();

  if (existingProviderTrackingError) {
    throw new Error(
      `Could not verify tracking uniqueness: ${existingProviderTrackingError.message}`,
    );
  }

  if (!existingProviderTracking) {
    return {
      trackingNumber: providerTrackingNumber,
      providerTrackingNumberOriginal: wasPlaceholder ? providerTrackingNumber : undefined,
      wasPlaceholder,
      usedInternalFallback: false,
    };
  }

  if (!wasPlaceholder) {
    throw new Error(
      `Tracking number already exists and does not look like a sandbox placeholder: ${providerTrackingNumber}`,
    );
  }

  const candidates = buildInternalTrackingCandidates(providerTrackingNumber, order.id);
  const { data: existingCandidates, error: existingCandidatesError } =
    await serviceSupabase
      .from("shipments")
      .select("tracking_number")
      .in("tracking_number", candidates)
      .returns<{ tracking_number: string }[]>();

  if (existingCandidatesError) {
    throw new Error(
      `Could not verify fallback tracking uniqueness: ${existingCandidatesError.message}`,
    );
  }

  const used = new Set((existingCandidates ?? []).map((row) => row.tracking_number));
  const trackingNumber = candidates.find((candidate) => !used.has(candidate));
  if (!trackingNumber) {
    throw new Error(
      `Could not allocate a unique internal tracking number for placeholder tracking: ${providerTrackingNumber}`,
    );
  }

  return {
    trackingNumber,
    providerTrackingNumberOriginal: providerTrackingNumber,
    wasPlaceholder,
    usedInternalFallback: true,
  };
}

function getSnapshotString(order: PendingLabelOrder, key: string, maxLength = 160): string | null {
  const value = order.rateSnapshot.pricingBreakdown?.[key];
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function getSnapshotNumber(order: PendingLabelOrder, key: string): number | null {
  const value = order.rateSnapshot.pricingBreakdown?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function hasPersistedLabelArtifacts(order: PendingLabelOrder): boolean {
  return Boolean(order.labelId || order.shipmentId || order.trackingNumber);
}

function isCompatibleRateIncreaseWithinGuard(
  originalProviderCost: number,
  currentProviderCost: number,
): boolean {
  if (originalProviderCost <= 0 || currentProviderCost <= 0) return false;
  if (currentProviderCost <= originalProviderCost) return true;

  const delta = currentProviderCost - originalProviderCost;
  return delta <= 1 || delta / originalProviderCost <= 0.1;
}

function isRateExpiredMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.includes("selected rate is no longer available") ||
    normalized.includes("rate no longer available") ||
    normalized.includes("rate expired") ||
    normalized.includes("rate changed before the label could be completed")
  );
}

function actionRequiredMessageForFailure(message: string): string {
  if (message === MEDIA_MAIL_ACTION_REQUIRED_MESSAGE) {
    return MEDIA_MAIL_ACTION_REQUIRED_MESSAGE;
  }
  if (isRateExpiredMessage(message)) {
    return RATE_EXPIRED_ACTION_REQUIRED_MESSAGE;
  }
  return `Automatic label purchase failed: ${message}`;
}

function getBatchMetadata(order: PendingLabelOrder): Record<string, unknown> {
  const batchId = getSnapshotString(order, "batchId", 120);
  if (!batchId) return {};

  return {
    batch_id: batchId,
    batch_index: getSnapshotNumber(order, "batchIndex"),
    batch_size: getSnapshotNumber(order, "batchSize"),
  };
}

// Persists a successfully purchased label as a shipments row.
// Direct insert via service_role — no wallet debit, no RPC.
// Stores pending_label_order_id in metadata for reconciliation.
async function persistShipmentFromPurchasedLabel(
  order: PendingLabelOrder,
  labelResult: LabelResult,
): Promise<PersistedShipmentResult> {
  const serviceSupabase = createServiceSupabaseClient();
  const shipmentId = crypto.randomUUID();
  const trackingResolution = await resolveTrackingNumberForShipment(
    serviceSupabase,
    order,
    labelResult.trackingNumber,
  );

  // Compute full pricing breakdown from snapshot data.
  // providerCost is present and validated before this path is reached.
  const snapshotProviderCost = order.rateSnapshot.providerCost ?? 0;
  const pricing = snapshotProviderCost > 0
    ? calculateCustomerPrice(snapshotProviderCost)
    : null;
  const customerPriceUsd = order.amountCents / 100;
  const productDescription = getSnapshotString(order, "productDescription");
  const batchMetadata = getBatchMetadata(order);
  const snapshotBatchPricing = {
    batchId: getSnapshotString(order, "batchId", 120),
    batchIndex: getSnapshotNumber(order, "batchIndex"),
    batchSize: getSnapshotNumber(order, "batchSize"),
    productDescription,
  };

  const { error } = await serviceSupabase.from("shipments").insert({
    id: shipmentId,
    user_id: order.userId,
    tracking_number: trackingResolution.trackingNumber,
    sender_name: order.origin.name?.trim() || "Sender",
    sender_phone: order.origin.phone?.trim() || "",
    origin_city: order.origin.city,
    recipient_name: order.destination.name?.trim() || "Recipient",
    recipient_phone: order.destination.phone?.trim() || "",
    destination_city: order.destination.city,
    destination_address: order.destination.street1?.trim() || "",
    weight: order.parcel.weight,
    product_type: productDescription || "Package",
    courier: labelResult.rate.courierName || labelResult.rate.courierId,
    shipping_subtotal: snapshotProviderCost > 0 ? snapshotProviderCost : customerPriceUsd,
    total: customerPriceUsd,
    customer_price: customerPriceUsd,
    provider_cost: snapshotProviderCost > 0 ? snapshotProviderCost : null,
    platform_markup: pricing?.platformMarkup ?? null,
    payment_fee: pricing?.paymentFee ?? null,
    pricing_subtotal: pricing?.subtotal ?? null,
    cash_on_delivery: false,
    cash_amount: 0,
    status: "Pendiente",
    value: customerPriceUsd,
    payment_status: "paid",
    label_status: "purchased",
    provider: order.provider,
    provider_label_id: labelResult.providerLabelId ?? null,
    provider_shipment_id: labelResult.providerShipmentId ?? null,
    provider_service_code:
      labelResult.providerServiceCode ?? order.serviceCode ?? null,
    label_url: labelResult.labelUrl ?? null,
    idempotency_key: `direct-label-${order.id}`,
    currency: "USD",
    pricing_model: "direct_label_payment",
    pricing_breakdown: pricing
      ? {
          ...pricing,
          paymentMethod: "card",
          ...Object.fromEntries(
            Object.entries(snapshotBatchPricing).filter(([, value]) => value !== null),
          ),
        }
      : null,
    metadata: {
      source: "direct_label_payment",
      pending_label_order_id: order.id,
      stripe_payment_intent_id: order.stripePaymentIntentId ?? null,
      ...batchMetadata,
      phase: "5.54",
      provider_tracking_number_original:
        trackingResolution.providerTrackingNumberOriginal ?? null,
      tracking_number_was_placeholder: trackingResolution.wasPlaceholder,
      tracking_number_internal_fallback: trackingResolution.usedInternalFallback,
    },
  });

  if (error) {
    throw new Error(`Shipment persist failed: ${error.message}`);
  }

  return {
    shipmentId,
    trackingNumber: trackingResolution.trackingNumber,
  };
}

// Inner implementation — called after all entry-point guards pass.
async function purchaseLabelFromPendingOrder(
  order: PendingLabelOrder,
  opts?: { carrierFailureStatus?: "action_required" | "refund_needed" },
): Promise<LabelPurchaseResult> {
  const logMeta = {
    orderId: order.id,
    userId: order.userId,
    provider: order.provider,
    idempotencyKey: order.idempotencyKey ?? null,
  };

  await createAuditLog({
    userId: order.userId,
    eventType: "label_purchase_claimed",
    severity: "info",
    entityType: "shipment",
    entityId: order.id,
    provider: order.provider,
    message: "Label purchase processor claimed pending order.",
    metadata: logMeta,
  });

  // Validate snapshots — failure marks action_required (data issue, not a payment issue).
  try {
    validateOrderSnapshots(order);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? "Invalid snapshots.");
    await markPendingLabelOrderActionRequired(order.id, msg);
    await createAuditLog({
      userId: order.userId,
      eventType: "label_purchase_action_required",
      severity: "error",
      entityType: "shipment",
      entityId: order.id,
      provider: order.provider,
      message: "Label purchase failed: invalid order snapshots.",
      metadata: { ...logMeta, reason: msg },
    });
    throw new Error(`Order marked action_required: ${msg}`);
  }

  const productDescription = getSnapshotString(order, "productDescription");
  if (shouldBlockMediaMailRate(order.serviceCode ?? order.rateSnapshot.serviceCode, productDescription)) {
    await markPendingLabelOrderActionRequired(order.id, MEDIA_MAIL_ACTION_REQUIRED_MESSAGE);
    await createAuditLog({
      userId: order.userId,
      eventType: "label_purchase_media_mail_guard_blocked",
      severity: "warning",
      entityType: "shipment",
      entityId: order.id,
      provider: order.provider,
      message: "Label purchase blocked because USPS Media Mail is not eligible for this product.",
      metadata: {
        ...logMeta,
        productDescription,
        serviceCode: order.serviceCode ?? order.rateSnapshot.serviceCode,
      },
    });
    throw new Error(`Order marked action_required: ${MEDIA_MAIL_ACTION_REQUIRED_MESSAGE}`);
  }

  // Only shipstation/ShipEngine supports server-side label purchase in this phase.
  const isShipEngine =
    order.provider === "shipstation" &&
    process.env.SHIPSTATION_API_MODE?.trim().toLowerCase() === "shipengine";

  if (!isShipEngine) {
    const reason = `Provider '${order.provider}' does not support server-side label creation yet. Only shipstation in ShipEngine mode is supported.`;
    await markPendingLabelOrderActionRequired(order.id, reason);
    await createAuditLog({
      userId: order.userId,
      eventType: "label_purchase_action_required",
      severity: "warning",
      entityType: "shipment",
      entityId: order.id,
      provider: order.provider,
      message: "Label purchase failed: unsupported provider.",
      metadata: { ...logMeta, reason },
    });
    throw new Error(`Order marked action_required: ${reason}`);
  }

  // Re-fetch rates to get a fresh providerRateId (rate IDs expire).
  let revalidatedRate: RateResult;
  try {
    revalidatedRate = await revalidateRateForOrder(order);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : String(err ?? "Rate revalidation failed.");
    await markPendingLabelOrderActionRequired(order.id, msg);
    await createAuditLog({
      userId: order.userId,
      eventType: "label_purchase_action_required",
      severity: "warning",
      entityType: "shipment",
      entityId: order.id,
      provider: order.provider,
      message: "Label purchase failed: rate no longer available.",
      metadata: { ...logMeta, reason: msg },
    });
    throw new Error(`Order marked action_required: ${msg}`);
  }

  const originalProviderCost = order.rateSnapshot.providerCost;
  const currentProviderCost = revalidatedRate.pricing.providerCost;
  if (!isCompatibleRateIncreaseWithinGuard(originalProviderCost, currentProviderCost)) {
    await markPendingLabelOrderActionRequired(order.id, RATE_EXPIRED_ACTION_REQUIRED_MESSAGE);
    await createAuditLog({
      userId: order.userId,
      eventType: "label_purchase_rate_guard_blocked",
      severity: "warning",
      entityType: "shipment",
      entityId: order.id,
      provider: order.provider,
      message: "Label purchase blocked because the refreshed provider cost exceeded the allowed guardrail.",
      metadata: {
        ...logMeta,
        originalProviderCost,
        currentProviderCost,
      },
    });
    throw new Error(`Order marked action_required: ${RATE_EXPIRED_ACTION_REQUIRED_MESSAGE}`);
  }

  // Call ShipEngine label API.
  const labelInput = buildLabelInput(order, revalidatedRate);
  let labelResult: LabelResult;
  try {
    await createAuditLog({
      userId: order.userId,
      eventType: "label_purchase_direct_fallback_started",
      severity: "info",
      entityType: "shipment",
      entityId: order.id,
      provider: order.provider,
      message: "ShipEngine label purchase started with direct shipment fallback enabled.",
      metadata: {
        ...logMeta,
        providerRateId: labelInput.providerRateId ?? null,
        carrierCode: labelInput.carrierCode ?? null,
        serviceCode: labelInput.serviceCode ?? null,
      },
    });
    labelResult = await new ShipEngineLabelAdapter().createLabel(labelInput);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? "Carrier call failed.");
    const shouldMarkActionRequired = opts?.carrierFailureStatus === "action_required";
    if (shouldMarkActionRequired) {
      await markPendingLabelOrderActionRequired(order.id, actionRequiredMessageForFailure(msg));
    } else {
      // Payment was captured — mark refund_needed so support can process a Stripe refund.
      await markPendingLabelOrderRefundNeeded(order.id, msg);
    }
    await createAuditLog({
      userId: order.userId,
      eventType: shouldMarkActionRequired
        ? "label_purchase_failed_action_required"
        : "label_purchase_failed_refund_needed",
      severity: "error",
      entityType: "shipment",
      entityId: order.id,
      provider: order.provider,
      message: shouldMarkActionRequired
        ? "Label purchase failed: carrier returned an error. Order marked action_required."
        : "Label purchase failed: carrier returned an error. Order marked refund_needed.",
      metadata: { ...logMeta, reason: msg },
    });
    await createAuditLog({
      userId: order.userId,
      eventType: isRateExpiredMessage(msg)
        ? "label_purchase_rate_id_failed_retrying_direct"
        : "label_purchase_direct_fallback_failed",
      severity: "error",
      entityType: "shipment",
      entityId: order.id,
      provider: order.provider,
      message: isRateExpiredMessage(msg)
        ? "ShipEngine rate ID purchase failed and direct fallback did not complete."
        : "ShipEngine direct label fallback failed.",
      metadata: { ...logMeta, reason: msg },
    });
    throw new Error(
      shouldMarkActionRequired
        ? `Order marked action_required: ${msg}`
        : `Order marked refund_needed: ${msg}`,
    );
  }

  if (labelResult.purchaseMethod === "direct_fallback") {
    await createAuditLog({
      userId: order.userId,
      eventType: "label_purchase_rate_id_failed_retrying_direct",
      severity: "warning",
      entityType: "shipment",
      entityId: order.id,
      provider: order.provider,
      message: "ShipEngine rate ID purchase failed and the processor retried with a direct label request.",
      metadata: {
        ...logMeta,
        attemptedProviderRateId: labelInput.providerRateId ?? null,
        finalProviderRateId: labelResult.rate.providerRateId ?? null,
      },
    });
    await createAuditLog({
      userId: order.userId,
      eventType: "label_purchase_direct_fallback_succeeded",
      severity: "info",
      entityType: "shipment",
      entityId: order.id,
      provider: order.provider,
      message: "ShipEngine direct label fallback succeeded after the original rate ID failed.",
      metadata: {
        ...logMeta,
        attemptedProviderRateId: labelInput.providerRateId,
        finalProviderRateId: labelResult.rate.providerRateId,
        providerLabelId: labelResult.providerLabelId ?? null,
      },
    });
  }

  // Persist shipment — no wallet debit.
  let persistedShipment: PersistedShipmentResult;
  try {
    persistedShipment = await persistShipmentFromPurchasedLabel(order, labelResult);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? "DB persist failed.");
    // Label exists but DB failed — needs manual reconciliation.
    await createReconciliationEvent({
      userId: order.userId,
      eventType: "label_purchase_db_persist_failed",
      entityType: "shipment",
      entityId: order.id,
      requestId: `label-${order.id}`,
      message: "Label was purchased but shipment DB persist failed.",
      metadata: {
        orderId: order.id,
        userId: order.userId,
        trackingNumber: labelResult.trackingNumber,
        providerLabelId: labelResult.providerLabelId ?? null,
        error: msg,
      },
    });
    // action_required (not refund_needed) — label exists, needs reconciliation.
    await markPendingLabelOrderActionRequired(
      order.id,
      `DB persist failed after label purchase: ${msg}. TrackingNumber=${labelResult.trackingNumber}`,
    );
    throw new Error(
      `Order marked action_required: DB persist failed. TrackingNumber=${labelResult.trackingNumber}`,
    );
  }

  // Mark order label_purchased with shipment reference.
  await markPendingLabelOrderLabelPurchased(order.id, {
    shipmentId: persistedShipment.shipmentId,
    labelId: labelResult.providerLabelId ?? null,
    trackingNumber: persistedShipment.trackingNumber,
  });

  await createAuditLog({
    userId: order.userId,
    eventType: "label_purchase_succeeded",
    severity: "info",
    entityType: "shipment",
    entityId: order.id,
    provider: order.provider,
    message: "Label purchased and shipment persisted successfully.",
    metadata: {
      ...logMeta,
      shipmentId: persistedShipment.shipmentId,
      trackingNumber: persistedShipment.trackingNumber,
      providerTrackingNumberOriginal: labelResult.trackingNumber,
      providerLabelId: labelResult.providerLabelId ?? null,
      hasLabelUrl: Boolean(labelResult.labelUrl),
    },
  });

  return {
    orderId: order.id,
    shipmentId: persistedShipment.shipmentId,
    trackingNumber: persistedShipment.trackingNumber,
    labelUrl: labelResult.labelUrl,
    providerLabelId: labelResult.providerLabelId ?? null,
    providerShipmentId: labelResult.providerShipmentId ?? null,
  };
}

// Public entry point. Loads the order, validates all safety guards, then delegates.
export async function purchaseLabelForPendingOrder(
  orderId: string,
  opts?: {
    allowTestMode?: boolean;
    allowActionRequiredRetry?: boolean;
    carrierFailureStatus?: "action_required" | "refund_needed";
  },
): Promise<LabelPurchaseResult> {
  if (process.env.ENABLE_REAL_LABEL_PURCHASE !== "true") {
    throw new Error("ENABLE_REAL_LABEL_PURCHASE is not enabled. Set it to true to purchase labels.");
  }

  const order = await getPendingLabelOrderByIdForAdmin(orderId);
  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const ownerGate = await canPurchaseRealLabelForUserId(order.userId);
  if (!ownerGate.allowed) {
    await createAuditLog({
      userId: order.userId,
      eventType: "label_feature_gate_denied",
      severity: "warning",
      entityType: "shipment",
      entityId: order.id,
      provider: order.provider,
      message: "Real label purchase blocked by account feature gate.",
      metadata: {
        orderId: order.id,
        reason: ownerGate.reason,
        feature: "real_label_purchase",
      },
    });
    throw new Error(ownerGate.message);
  }

  // Idempotency — already purchased.
  if (order.status === "label_purchased") {
    if (!order.shipmentId || !order.trackingNumber) {
      throw new Error(
        "Order is label_purchased but missing shipmentId or trackingNumber. Needs manual review.",
      );
    }
    return {
      orderId: order.id,
      shipmentId: order.shipmentId,
      trackingNumber: order.trackingNumber,
      labelUrl: null,
      providerLabelId: order.labelId ?? null,
      providerShipmentId: null,
    };
  }

  if (order.status === "label_purchase_pending") {
    throw new Error("This label order is already being processed.");
  }

  if (order.status === "paid_test_mode" && !opts?.allowTestMode) {
    throw new Error("Order is paid_test_mode and cannot be processed without explicit admin allow_test_mode.");
  }

  const canRetryActionRequired =
    opts?.allowActionRequiredRetry &&
    order.status === "action_required" &&
    !hasPersistedLabelArtifacts(order);

  if (
    order.status !== "paid_waiting_label_purchase" &&
    !(opts?.allowTestMode && order.status === "paid_test_mode") &&
    !canRetryActionRequired
  ) {
    throw new Error(
      `Order status '${order.status}' does not allow label purchase. ` +
        "Allowed: paid_waiting_label_purchase.",
    );
  }

  // Require Stripe payment confirmation.
  if (!order.paidAt) {
    throw new Error("Order has no paid_at timestamp — payment was not confirmed by Stripe.");
  }
  if (!order.stripePaymentIntentId) {
    throw new Error(
      "Order has no stripe_payment_intent_id — cannot verify that payment was captured.",
    );
  }

  // Guard against ambiguous state: label data present but status not terminal.
  if (hasPersistedLabelArtifacts(order)) {
    throw new Error(
      "Order already has label or shipment data but status is not label_purchased. " +
        "This needs manual review — do not re-purchase.",
    );
  }

  const claimedOrder = await claimPendingLabelOrderForPurchase(order.id, {
    allowTestMode: opts?.allowTestMode,
    allowActionRequiredRetry: opts?.allowActionRequiredRetry,
  });

  if (!claimedOrder) {
    const latest = await getPendingLabelOrderByIdForAdmin(order.id);
    if (latest?.status === "label_purchased") {
      if (!latest.shipmentId || !latest.trackingNumber) {
        throw new Error(
          "Order is label_purchased but missing shipmentId or trackingNumber. Needs manual review.",
        );
      }
      return {
        orderId: latest.id,
        shipmentId: latest.shipmentId,
        trackingNumber: latest.trackingNumber,
        labelUrl: null,
        providerLabelId: latest.labelId ?? null,
        providerShipmentId: null,
      };
    }
    if (latest?.status === "label_purchase_pending") {
      throw new Error("This label order is already being processed.");
    }
    if (latest?.status === "paid_test_mode") {
      throw new Error("Order is paid_test_mode and was not claimed for processing.");
    }
    throw new Error(
      `Order could not be claimed for label purchase. Current status: ${latest?.status ?? "unknown"}.`,
    );
  }

  return purchaseLabelFromPendingOrder(claimedOrder, {
    carrierFailureStatus: opts?.carrierFailureStatus,
  });
}
