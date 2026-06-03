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
    providerStatus: row.provider_status,
    providerTrackingId: row.provider_tracking_id,
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
    customerPrice: centsToDollars(row.customer_price),
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
    providerOrderId: row.provider_order_id,
    providerCost: centsToDollars(row.provider_cost),
    margin: centsToDollars(row.margin),
    adminNotes: row.admin_notes,
    metadata: row.metadata,
  };
}

export function normalizeCreateEcuadorShipmentRequestInput(body: unknown): NormalizedCreateEcuadorShipmentRequestInput {
  const input = (body ?? {}) as Record<string, unknown>;
  const provider: EcuadorProvider = input.provider === "mock" ? "mock" : input.provider === "manual" ? "manual" : "manual";
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
  if (updates.provider) patch.provider = updates.provider;
  if (updates.providerStatus !== undefined) patch.provider_status = cleanNullableText(updates.providerStatus);
  if (updates.providerOrderId !== undefined) patch.provider_order_id = cleanNullableText(updates.providerOrderId);
  if (updates.providerTrackingId !== undefined) patch.provider_tracking_id = cleanNullableText(updates.providerTrackingId);
  if (updates.customerPrice !== undefined) patch.customer_price = updates.customerPrice == null ? null : dollarsToCents(updates.customerPrice);
  if (updates.providerCost !== undefined) patch.provider_cost = updates.providerCost == null ? null : dollarsToCents(updates.providerCost);
  if (updates.margin !== undefined) patch.margin = updates.margin == null ? null : dollarsToCents(updates.margin);
  if (updates.adminNotes !== undefined) patch.admin_notes = cleanNullableText(updates.adminNotes);

  if (Object.keys(patch).length === 0) {
    return getAdminEcuadorShipmentRequest(supabase, id);
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
