import type { SupabaseClient } from "@supabase/supabase-js";
import { calculatePrepEstimateCents, PREP_BASE_UNIT_PRICE_CENTS } from "@/lib/prep";
import type {
  PrepOrder,
  PrepOrderDocument,
  PrepOrderEvent,
  PrepOrderItem,
  PrepOrderStatus,
  PrepOrderVisibility,
} from "@/lib/types";

export type PrepOrderRow = {
  id: string;
  user_id: string;
  status: PrepOrderStatus;
  service_type: string;
  marketplace: string;
  business_name: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  product_summary: string;
  total_units: number;
  total_cartons: number;
  estimated_unit_price: number | null;
  estimated_total: number | null;
  final_unit_price: number | null;
  final_total: number | null;
  partner_cost_total: number | null;
  margin_total: number | null;
  customer_notes: string | null;
  admin_notes: string | null;
  partner_name_internal: string | null;
  partner_reference_internal: string | null;
  receiving_reference: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type PrepOrderItemRow = {
  id: string;
  prep_order_id: string;
  sku: string | null;
  product_name: string;
  asin: string | null;
  units: number;
  cartons: number;
  prep_services: string[] | null;
  notes: string | null;
  created_at: string;
};

export type PrepOrderEventRow = {
  id: string;
  prep_order_id: string;
  visibility: PrepOrderVisibility;
  status: PrepOrderStatus | null;
  title: string;
  message: string | null;
  created_by: string | null;
  created_at: string;
};

export type PrepOrderDocumentRow = {
  id: string;
  prep_order_id: string;
  visibility: PrepOrderVisibility;
  file_name: string;
  file_url: string | null;
  storage_path: string | null;
  document_type: string | null;
  created_at: string;
};

export type CreatePrepOrderInput = {
  marketplace: string;
  businessName?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  productSummary: string;
  totalUnits: number;
  totalCartons: number;
  customerNotes?: string;
  items: Array<{
    sku?: string;
    productName: string;
    asin?: string;
    units: number;
    cartons: number;
    prepServices: string[];
    notes?: string;
  }>;
};

export function fromPrepOrderRow(row: PrepOrderRow, opts?: {
  items?: PrepOrderItemRow[];
  events?: PrepOrderEventRow[];
  documents?: PrepOrderDocumentRow[];
  includeInternal?: boolean;
}): PrepOrder {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    serviceType: row.service_type,
    marketplace: row.marketplace,
    businessName: row.business_name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    productSummary: row.product_summary,
    totalUnits: row.total_units,
    totalCartons: row.total_cartons,
    estimatedUnitPrice: centsToDollars(row.estimated_unit_price),
    estimatedTotal: centsToDollars(row.estimated_total),
    finalUnitPrice: centsToDollars(row.final_unit_price),
    finalTotal: centsToDollars(row.final_total),
    partnerCostTotal: opts?.includeInternal ? centsToDollars(row.partner_cost_total) : null,
    marginTotal: opts?.includeInternal ? centsToDollars(row.margin_total) : null,
    customerNotes: row.customer_notes,
    adminNotes: opts?.includeInternal ? row.admin_notes : null,
    partnerNameInternal: opts?.includeInternal ? row.partner_name_internal : null,
    partnerReferenceInternal: opts?.includeInternal ? row.partner_reference_internal : null,
    receivingReference: row.receiving_reference,
    metadata: opts?.includeInternal ? row.metadata : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: opts?.items?.map(fromPrepOrderItemRow),
    events: opts?.events?.map(fromPrepOrderEventRow),
    documents: opts?.documents?.map(fromPrepOrderDocumentRow),
  };
}

export function fromPrepOrderItemRow(row: PrepOrderItemRow): PrepOrderItem {
  return {
    id: row.id,
    prepOrderId: row.prep_order_id,
    sku: row.sku,
    productName: row.product_name,
    asin: row.asin,
    units: row.units,
    cartons: row.cartons,
    prepServices: row.prep_services ?? [],
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function fromPrepOrderEventRow(row: PrepOrderEventRow): PrepOrderEvent {
  return {
    id: row.id,
    prepOrderId: row.prep_order_id,
    visibility: row.visibility,
    status: row.status,
    title: row.title,
    message: row.message,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function fromPrepOrderDocumentRow(row: PrepOrderDocumentRow): PrepOrderDocument {
  return {
    id: row.id,
    prepOrderId: row.prep_order_id,
    visibility: row.visibility,
    fileName: row.file_name,
    fileUrl: row.file_url,
    storagePath: row.storage_path,
    documentType: row.document_type,
    createdAt: row.created_at,
  };
}

export function centsToDollars(value?: number | null) {
  if (value == null) return null;
  return value / 100;
}

export function dollarsToCents(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function normalizeCreatePrepOrderInput(body: unknown): CreatePrepOrderInput {
  const input = (body ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(input.items) ? input.items : [];
  const items = rawItems.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const services = Array.isArray(row.prepServices)
      ? row.prepServices.map((service) => cleanText(service)).filter(Boolean)
      : [];
    return {
      sku: cleanText(row.sku),
      productName: cleanText(row.productName),
      asin: cleanText(row.asin),
      units: Math.max(Math.trunc(Number(row.units) || 0), 0),
      cartons: Math.max(Math.trunc(Number(row.cartons) || 0), 0),
      prepServices: services,
      notes: cleanText(row.notes),
    };
  }).filter((item) => item.productName && item.units > 0);

  const totalUnits = Math.max(Math.trunc(Number(input.totalUnits) || 0), 0);
  const totalCartons = Math.max(Math.trunc(Number(input.totalCartons) || 0), 0);
  const normalized = {
    marketplace: cleanText(input.marketplace, "amazon_fba"),
    businessName: cleanText(input.businessName),
    contactName: cleanText(input.contactName),
    contactEmail: cleanText(input.contactEmail),
    contactPhone: cleanText(input.contactPhone),
    productSummary: cleanText(input.productSummary),
    totalUnits: totalUnits || items.reduce((sum, item) => sum + item.units, 0),
    totalCartons: totalCartons || items.reduce((sum, item) => sum + item.cartons, 0),
    customerNotes: cleanText(input.customerNotes),
    items,
  };

  if (!normalized.contactName) throw new Error("Contact name is required.");
  if (!normalized.contactEmail || !normalized.contactEmail.includes("@")) throw new Error("A valid contact email is required.");
  if (!normalized.productSummary) throw new Error("Product summary is required.");
  if (normalized.totalUnits <= 0) throw new Error("Total units must be greater than zero.");
  if (items.length === 0) throw new Error("Add at least one product item.");
  return normalized;
}

export async function createPrepOrder(
  supabase: SupabaseClient,
  userId: string,
  input: CreatePrepOrderInput,
) {
  const estimatedUnitPrice = PREP_BASE_UNIT_PRICE_CENTS;
  const estimatedTotal = calculatePrepEstimateCents(input.totalUnits, estimatedUnitPrice);

  const { data: order, error } = await supabase
    .from("prep_orders")
    .insert({
      user_id: userId,
      status: "quote_requested",
      service_type: "managed_fba_prep",
      marketplace: input.marketplace || "amazon_fba",
      business_name: input.businessName || null,
      contact_name: input.contactName,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone || null,
      product_summary: input.productSummary,
      total_units: input.totalUnits,
      total_cartons: input.totalCartons,
      estimated_unit_price: estimatedUnitPrice,
      estimated_total: estimatedTotal,
      customer_notes: input.customerNotes || null,
      metadata: { source: "sendiflash_prep_mvp" },
    })
    .select("*")
    .single<PrepOrderRow>();

  if (error) throw error;

  const itemRows = input.items.map((item) => ({
    prep_order_id: order.id,
    sku: item.sku || null,
    product_name: item.productName,
    asin: item.asin || null,
    units: item.units,
    cartons: item.cartons,
    prep_services: item.prepServices,
    notes: item.notes || null,
  }));

  const { data: items, error: itemsError } = await supabase
    .from("prep_order_items")
    .insert(itemRows)
    .select("*")
    .returns<PrepOrderItemRow[]>();
  if (itemsError) throw itemsError;

  const { data: event, error: eventError } = await supabase
    .from("prep_order_events")
    .insert({
      prep_order_id: order.id,
      visibility: "customer",
      status: "quote_requested",
      title: "Prep request received",
      message: "SendiFlash will review your FBA prep request and confirm next steps.",
      created_by: userId,
    })
    .select("*")
    .single<PrepOrderEventRow>();
  if (eventError) throw eventError;

  return fromPrepOrderRow(order, { items: items ?? [], events: event ? [event] : [] });
}

export async function loadPrepOrderDetails(
  supabase: SupabaseClient,
  order: PrepOrderRow,
  includeInternal = false,
) {
  const [{ data: items, error: itemError }, { data: events, error: eventError }, { data: documents, error: documentError }] =
    await Promise.all([
      supabase.from("prep_order_items").select("*").eq("prep_order_id", order.id).order("created_at", { ascending: true }).returns<PrepOrderItemRow[]>(),
      supabase.from("prep_order_events").select("*").eq("prep_order_id", order.id).order("created_at", { ascending: false }).returns<PrepOrderEventRow[]>(),
      supabase.from("prep_order_documents").select("*").eq("prep_order_id", order.id).order("created_at", { ascending: false }).returns<PrepOrderDocumentRow[]>(),
    ]);
  if (itemError) throw itemError;
  if (eventError) throw eventError;
  if (documentError) throw documentError;

  return fromPrepOrderRow(order, {
    items: items ?? [],
    events: includeInternal ? events ?? [] : (events ?? []).filter((event) => event.visibility === "customer"),
    documents: includeInternal ? documents ?? [] : (documents ?? []).filter((document) => document.visibility === "customer"),
    includeInternal,
  });
}
