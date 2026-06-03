import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminEcuadorShipmentRequest,
  CreateEcuadorShipmentRequestBody,
  EcuadorProvider,
  EcuadorShipmentEvent,
  EcuadorShipmentRequest,
  EcuadorShipmentStatus,
  EcuadorShipmentVisibility,
} from "@/lib/ecuador/types";
import {
  ECUADOR_ADMIN_EDITABLE_STATUSES as ADMIN_STATUSES,
  ECUADOR_ADMIN_PROVIDERS as ADMIN_PROVIDERS,
  ECUADOR_CUSTOMER_REQUEST_STATUSES as CUSTOMER_STATUSES,
  ECUADOR_REQUEST_PROVIDERS as CUSTOMER_PROVIDERS,
} from "@/lib/ecuador/types";

export type RegionalShipmentRow = {
  id: string;
  user_id: string;
  market: "EC";
  service_type: "ecuador_delivery";
  provider: EcuadorProvider;
  status: EcuadorShipmentStatus;
  payment_status: "unpaid" | "pending" | "paid" | "failed" | "refunded_manual";
  provider_order_id: string | null;
  provider_tracking_id: string | null;
  provider_status: string | null;
  origin_name: string | null;
  origin_phone: string | null;
  origin_address: string | null;
  origin_city: string | null;
  origin_reference: string | null;
  destination_name: string | null;
  destination_phone: string | null;
  destination_address: string | null;
  destination_city: string | null;
  destination_reference: string | null;
  package_description: string | null;
  package_weight: number | null;
  package_length: number | null;
  package_width: number | null;
  package_height: number | null;
  declared_value: number | null;
  provider_cost: number | null;
  customer_price: number | null;
  margin: number | null;
  customer_notes: string | null;
  admin_notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type RegionalShipmentEventRow = {
  id: string;
  regional_shipment_id: string;
  visibility: EcuadorShipmentVisibility;
  status: EcuadorShipmentStatus | null;
  title: string;
  message: string | null;
  created_by: string | null;
  created_at: string;
};

type NormalizedCreateEcuadorShipmentRequestInput =
  Omit<CreateEcuadorShipmentRequestBody, "packageWeight"> & {
    provider: EcuadorProvider;
    status: EcuadorShipmentStatus;
    packageWeight: number;
  };

const FORBIDDEN_CUSTOMER_FIELDS = [
  "user_id",
  "provider_order_id",
  "providerOrderId",
  "provider_tracking_id",
  "providerTrackingId",
  "provider_status",
  "providerStatus",
  "provider_cost",
  "providerCost",
  "customer_price",
  "customerPrice",
  "margin",
  "admin_notes",
  "adminNotes",
  "metadata",
  "payment_status",
  "paymentStatus",
  "market",
  "service_type",
  "serviceType",
] as const;

const ECUADOR_CUSTOMER_ERROR_MESSAGES = new Set([
  "Customer requests cannot set internal Ecuador fields.",
  "Customer requests can only use manual or mock provider mode.",
  "Customer requests can only use draft or quote_requested status.",
  "Origin name is required.",
  "Origin phone is required.",
  "Origin address is required.",
  "Origin city is required.",
  "Destination name is required.",
  "Destination phone is required.",
  "Destination address is required.",
  "Destination city is required.",
  "Package description is required.",
  "Package weight must be greater than zero.",
  "Invalid Ecuador status filter.",
  "Invalid Ecuador shipment id.",
  "Invalid Ecuador admin status filter.",
  "Invalid Ecuador admin provider.",
  "Invalid Ecuador admin event status.",
  "No valid Ecuador admin fields were provided.",
]);

const CUSTOMER_PROVIDER_SET = new Set<string>(CUSTOMER_PROVIDERS);
const CUSTOMER_STATUS_SET = new Set<string>(CUSTOMER_STATUSES);
const ADMIN_STATUS_SET = new Set<string>(ADMIN_STATUSES);
const ADMIN_PROVIDER_SET = new Set<string>(ADMIN_PROVIDERS);
const ADMIN_EVENT_STATUS_SET = new Set<string>(["draft", ...ADMIN_STATUSES]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNullableText(value: unknown) {
  const text = cleanText(value);
  return text || null;
}

function cleanPositiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function dollarsToCents(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function centsToDollars(value?: number | null) {
  return value == null ? null : value / 100;
}

export function fromRegionalShipmentEventRow(row: RegionalShipmentEventRow): EcuadorShipmentEvent {
  return {
    id: row.id,
    visibility: row.visibility,
    status: row.status,
    title: row.title,
    message: row.message,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function fromRegionalShipmentRow(
  row: RegionalShipmentRow,
  opts?: { includeInternal?: boolean; events?: RegionalShipmentEventRow[] },
): EcuadorShipmentRequest | AdminEcuadorShipmentRequest {
  const events = (opts?.events ?? []).map(fromRegionalShipmentEventRow);
  const base: EcuadorShipmentRequest = {
    id: row.id,
    market: row.market,
    serviceType: row.service_type,
    provider: row.provider,
    status: row.status,
    paymentStatus: row.payment_status,
    originName: row.origin_name,
    originPhone: row.origin_phone,
    originAddress: row.origin_address,
    originCity: row.origin_city,
    originReference: row.origin_reference,
    destinationName: row.destination_name,
    destinationPhone: row.destination_phone,
    destinationAddress: row.destination_address,
    destinationCity: row.destination_city,
    destinationReference: row.destination_reference,
    packageDescription: row.package_description,
    packageWeight: row.package_weight,
    packageLength: row.package_length,
    packageWidth: row.package_width,
    packageHeight: row.package_height,
    declaredValue: row.declared_value,
    customerNotes: row.customer_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events,
  };

  if (!opts?.includeInternal) {
    return base;
  }

  return {
    ...base,
    userId: row.user_id,
    providerStatus: row.provider_status,
    providerTrackingId: row.provider_tracking_id,
    providerOrderId: row.provider_order_id,
    customerPrice: centsToDollars(row.customer_price),
    providerCost: centsToDollars(row.provider_cost),
    margin: centsToDollars(row.margin),
    adminNotes: row.admin_notes,
    metadata: row.metadata,
  };
}

export function normalizeCreateEcuadorShipmentRequestInput(body: unknown): NormalizedCreateEcuadorShipmentRequestInput {
  const input = (body ?? {}) as Record<string, unknown>;
  if (FORBIDDEN_CUSTOMER_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(input, field))) {
    throw new Error("Customer requests cannot set internal Ecuador fields.");
  }

  if (input.provider != null && !CUSTOMER_PROVIDER_SET.has(String(input.provider))) {
    throw new Error("Customer requests can only use manual or mock provider mode.");
  }

  if (input.status != null && !["draft", "quote_requested"].includes(String(input.status))) {
    throw new Error("Customer requests can only use draft or quote_requested status.");
  }

  const provider: EcuadorProvider = input.provider === "mock" ? "mock" : "manual";
  const status: EcuadorShipmentStatus = input.status === "draft" ? "draft" : "quote_requested";

  const normalized = {
    provider,
    status,
    originName: cleanText(input.originName),
    originPhone: cleanText(input.originPhone),
    originAddress: cleanText(input.originAddress),
    originCity: cleanText(input.originCity),
    originReference: cleanText(input.originReference),
    destinationName: cleanText(input.destinationName),
    destinationPhone: cleanText(input.destinationPhone),
    destinationAddress: cleanText(input.destinationAddress),
    destinationCity: cleanText(input.destinationCity),
    destinationReference: cleanText(input.destinationReference),
    packageDescription: cleanText(input.packageDescription),
    packageWeight: cleanPositiveNumber(input.packageWeight),
    packageLength: cleanPositiveNumber(input.packageLength) ?? undefined,
    packageWidth: cleanPositiveNumber(input.packageWidth) ?? undefined,
    packageHeight: cleanPositiveNumber(input.packageHeight) ?? undefined,
    declaredValue: cleanPositiveNumber(input.declaredValue) ?? undefined,
    customerNotes: cleanText(input.customerNotes),
  };

  if (!normalized.originName) throw new Error("Origin name is required.");
  if (!normalized.originPhone) throw new Error("Origin phone is required.");
  if (!normalized.originAddress) throw new Error("Origin address is required.");
  if (!normalized.originCity) throw new Error("Origin city is required.");
  if (!normalized.destinationName) throw new Error("Destination name is required.");
  if (!normalized.destinationPhone) throw new Error("Destination phone is required.");
  if (!normalized.destinationAddress) throw new Error("Destination address is required.");
  if (!normalized.destinationCity) throw new Error("Destination city is required.");
  if (!normalized.packageDescription) throw new Error("Package description is required.");
  const packageWeight = normalized.packageWeight;
  if (!packageWeight) throw new Error("Package weight must be greater than zero.");

  return {
    ...normalized,
    packageWeight,
  };
}

export async function createEcuadorShipmentRequest(
  supabase: SupabaseClient,
  userId: string,
  input: NormalizedCreateEcuadorShipmentRequestInput,
) {
  const { data: shipment, error } = await supabase
    .from("regional_shipments")
    .insert({
      user_id: userId,
      market: "EC",
      service_type: "ecuador_delivery",
      provider: input.provider,
      status: input.status,
      payment_status: "unpaid",
      origin_name: input.originName,
      origin_phone: input.originPhone,
      origin_address: input.originAddress,
      origin_city: input.originCity,
      origin_reference: input.originReference || null,
      destination_name: input.destinationName,
      destination_phone: input.destinationPhone,
      destination_address: input.destinationAddress,
      destination_city: input.destinationCity,
      destination_reference: input.destinationReference || null,
      package_description: input.packageDescription,
      package_weight: input.packageWeight,
      package_length: input.packageLength,
      package_width: input.packageWidth,
      package_height: input.packageHeight,
      declared_value: input.declaredValue ? Math.round(input.declaredValue) : null,
      customer_notes: input.customerNotes || null,
      metadata: {
        source: "ecuador_beta_request",
        betaFlow: true,
        liveProviderCall: false,
      },
    })
    .select("*")
    .single<RegionalShipmentRow>();
  if (error) throw error;

  const { data: event, error: eventError } = await supabase
    .from("regional_shipment_events")
    .insert({
      regional_shipment_id: shipment.id,
      visibility: "customer",
      status: shipment.status,
      title: "Ecuador Shipping request created for beta review.",
      message: "Esta solicitud no crea un envío real todavía. El equipo de SendiFlash la revisará para el acceso beta.",
      created_by: userId,
    })
    .select("*")
    .single<RegionalShipmentEventRow>();
  if (eventError) throw eventError;

  return fromRegionalShipmentRow(shipment, { events: event ? [event] : [] });
}

async function loadShipmentEvents(
  supabase: SupabaseClient,
  shipmentId: string,
  includeInternal = false,
) {
  const query = supabase
    .from("regional_shipment_events")
    .select("*")
    .eq("regional_shipment_id", shipmentId)
    .order("created_at", { ascending: false });
  const { data, error } = await query.returns<RegionalShipmentEventRow[]>();
  if (error) throw error;
  return includeInternal ? (data ?? []) : (data ?? []).filter((event) => event.visibility === "customer");
}

export async function listUserEcuadorShipmentRequests(
  supabase: SupabaseClient,
  userId: string,
  filters?: { status?: string | null; limit?: number },
) {
  if (filters?.status && !CUSTOMER_STATUS_SET.has(filters.status)) {
    throw new Error("Invalid Ecuador status filter.");
  }

  let query = supabase
    .from("regional_shipments")
    .select("*")
    .eq("user_id", userId)
    .eq("market", "EC")
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 100);

  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query.returns<RegionalShipmentRow[]>();
  if (error) throw error;
  return (data ?? []).map((row) => fromRegionalShipmentRow(row));
}

export async function getUserEcuadorShipmentRequest(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error("Invalid Ecuador shipment id.");
  }

  const { data, error } = await supabase
    .from("regional_shipments")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .eq("market", "EC")
    .maybeSingle<RegionalShipmentRow>();
  if (error) throw error;
  if (!data) return null;
  const events = await loadShipmentEvents(supabase, data.id);
  return fromRegionalShipmentRow(data, { events });
}

export async function listAdminEcuadorShipmentRequests(
  supabase: SupabaseClient,
  filters?: { status?: string | null; search?: string | null; limit?: number },
) {
  if (filters?.status && !ADMIN_STATUS_SET.has(filters.status)) {
    throw new Error("Invalid Ecuador admin status filter.");
  }

  let query = supabase
    .from("regional_shipments")
    .select("*")
    .eq("market", "EC")
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 100);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) {
    const search = filters.search.replaceAll(",", " ").trim();
    query = query.or(
      `id.ilike.%${search}%,origin_city.ilike.%${search}%,destination_city.ilike.%${search}%,destination_name.ilike.%${search}%,origin_name.ilike.%${search}%`,
    );
  }

  const { data, error } = await query.returns<RegionalShipmentRow[]>();
  if (error) throw error;
  return (data ?? []).map((row) => fromRegionalShipmentRow(row, { includeInternal: true }) as AdminEcuadorShipmentRequest);
}

export async function getAdminEcuadorShipmentRequest(
  supabase: SupabaseClient,
  id: string,
) {
  const { data, error } = await supabase
    .from("regional_shipments")
    .select("*")
    .eq("id", id)
    .eq("market", "EC")
    .maybeSingle<RegionalShipmentRow>();
  if (error) throw error;
  if (!data) return null;
  const events = await loadShipmentEvents(supabase, id, true);
  return fromRegionalShipmentRow(data, { includeInternal: true, events }) as AdminEcuadorShipmentRequest;
}

export async function updateAdminEcuadorShipmentRequest(
  supabase: SupabaseClient,
  id: string,
  updates: {
    status?: EcuadorShipmentStatus;
    provider?: EcuadorProvider;
    providerStatus?: string | null;
    providerOrderId?: string | null;
    providerTrackingId?: string | null;
    customerPrice?: number | null;
    providerCost?: number | null;
    margin?: number | null;
    adminNotes?: string | null;
  },
) {
  const patch: Record<string, unknown> = {};

  if (updates.status) patch.status = updates.status;
  if (updates.provider) {
    if (!ADMIN_PROVIDER_SET.has(updates.provider)) {
      throw new Error("Invalid Ecuador admin provider.");
    }
    patch.provider = updates.provider;
  }
  if (updates.providerStatus !== undefined) patch.provider_status = cleanNullableText(updates.providerStatus);
  if (updates.providerOrderId !== undefined) patch.provider_order_id = cleanNullableText(updates.providerOrderId);
  if (updates.providerTrackingId !== undefined) patch.provider_tracking_id = cleanNullableText(updates.providerTrackingId);
  if (updates.customerPrice !== undefined) patch.customer_price = updates.customerPrice == null ? null : dollarsToCents(updates.customerPrice);
  if (updates.providerCost !== undefined) patch.provider_cost = updates.providerCost == null ? null : dollarsToCents(updates.providerCost);
  if (updates.margin !== undefined) patch.margin = updates.margin == null ? null : dollarsToCents(updates.margin);
  if (updates.adminNotes !== undefined) patch.admin_notes = cleanNullableText(updates.adminNotes);

  if (Object.keys(patch).length === 0) {
    throw new Error("No valid Ecuador admin fields were provided.");
  }

  const { data, error } = await supabase
    .from("regional_shipments")
    .update(patch)
    .eq("id", id)
    .eq("market", "EC")
    .select("*")
    .maybeSingle<RegionalShipmentRow>();
  if (error) throw error;
  if (!data) return null;
  const events = await loadShipmentEvents(supabase, id, true);
  return fromRegionalShipmentRow(data, { includeInternal: true, events }) as AdminEcuadorShipmentRequest;
}

export async function addRegionalShipmentEvent(
  supabase: SupabaseClient,
  id: string,
  event: {
    visibility: EcuadorShipmentVisibility;
    status?: EcuadorShipmentStatus | null;
    title: string;
    message?: string | null;
    createdBy?: string | null;
  },
) {
  if (event.status && !ADMIN_EVENT_STATUS_SET.has(event.status)) {
    throw new Error("Invalid Ecuador admin event status.");
  }
  const { error } = await supabase.from("regional_shipment_events").insert({
    regional_shipment_id: id,
    visibility: event.visibility,
    status: event.status ?? null,
    title: cleanText(event.title),
    message: cleanNullableText(event.message),
    created_by: event.createdBy ?? null,
  });
  if (error) throw error;
}

export function isKnownEcuadorRequestErrorMessage(message: string) {
  return ECUADOR_CUSTOMER_ERROR_MESSAGES.has(message);
}
