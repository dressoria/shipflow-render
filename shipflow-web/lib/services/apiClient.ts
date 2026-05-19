import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Envio, MovimientoSaldo, TrackingEvent, Usuario } from "@/lib/types";
import type { LogisticsProvider, RateResult } from "@/lib/logistics/types";

async function getToken(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

type ApiEnvelope<T> = { success: boolean; data: T | null; error: string | null };

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const existingHeaders = (init.headers ?? {}) as Record<string, string>;
  const res = await fetch(path, { ...init, headers: { ...headers, ...existingHeaders } });
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !json.success) throw new Error(json.error ?? `API error (${res.status})`);
  return json.data as T;
}

export function isEmailNotVerifiedError(error: unknown): boolean {
  return error instanceof Error && error.message === "EMAIL_NOT_VERIFIED";
}

// ── Config status ───────────────────────────────────────────────────────────

export type ConfigStatus = {
  supabaseConfigured: boolean;
  serviceRoleConfigured: boolean;
  ratesConfigured: boolean;
  googleMapsConfigured: boolean;
  activeRateProviders: number;
  labelPurchaseEnabled: boolean;
  labelVoidEnabled: boolean;
};

// Public fetch — no auth token required. Returns configuration booleans only.
export async function apiGetConfigStatus(): Promise<ConfigStatus> {
  const res = await fetch("/api/config/status");
  const json = (await res.json()) as { success: boolean; data: ConfigStatus | null; error: string | null };
  if (!res.ok || !json.success || !json.data) {
    return {
      supabaseConfigured: false,
      serviceRoleConfigured: false,
      ratesConfigured: false,
      googleMapsConfigured: false,
      activeRateProviders: 0,
      labelPurchaseEnabled: false,
      labelVoidEnabled: false,
    };
  }
  return json.data;
}

// ── Balance ─────────────────────────────────────────────────────────────────

export type BalanceMovement = {
  id: string;
  userId?: string;
  concept: string;
  amount: number;
  date: string;
  type?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  shipmentId?: string | null;
};

export type BalanceTotals = {
  totalRecharged: number;
  totalSpent: number;
  totalRefunded: number;
  totalAdjustments: number;
  totalFees: number;
};

export type BalanceData = {
  balance: number;
  availableBalance: number;
  currency: string;
  totals: BalanceTotals;
  movements: BalanceMovement[];
  recentMovements: BalanceMovement[];
};

export async function apiGetBalance(): Promise<BalanceData> {
  return apiFetch<BalanceData>("/api/balance");
}

// ── Admin support ───────────────────────────────────────────────────────────

export type AdminShipment = Envio & {
  userEmail?: string | null;
  userName?: string | null;
};

export type AdminBalanceMovement = MovimientoSaldo & {
  userEmail?: string | null;
  trackingNumber?: string | null;
  reason?: string | null;
  note?: string | null;
  adminEmail?: string | null;
};

export type AdminTotals = {
  totalUsers: number;
  totalShipments: number;
  labelsPurchased: number;
  labelsVoided: number;
  totalRecharged: number;
  totalLabelSpend: number;
  totalRefunded: number;
};

export type AdminOverviewData = {
  users: Usuario[];
  shipments: AdminShipment[];
  movements: AdminBalanceMovement[];
  auditEvents?: AdminAuditEvent[];
  totals: AdminTotals;
  reconciliation: {
    pendingCount: number;
    notes: string[];
  };
};

export type AdminAuditEvent = {
  id: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  userId?: string | null;
  eventType: string;
  severity: "info" | "warning" | "error" | "critical" | string;
  entityType?: string | null;
  entityId?: string | null;
  provider?: string | null;
  trackingNumber?: string | null;
  idempotencyKey?: string | null;
  requestId?: string | null;
  message: string;
  createdAt: string;
};

export async function apiGetAdminOverview(): Promise<AdminOverviewData> {
  return apiFetch<AdminOverviewData>("/api/admin/overview");
}

export async function apiGetAdminShipments(params?: {
  limit?: number;
  trackingNumber?: string;
  labelStatus?: string;
  paymentStatus?: string;
  email?: string;
}): Promise<{ shipments: AdminShipment[]; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.trackingNumber) qs.set("trackingNumber", params.trackingNumber);
  if (params?.labelStatus) qs.set("labelStatus", params.labelStatus);
  if (params?.paymentStatus) qs.set("paymentStatus", params.paymentStatus);
  if (params?.email) qs.set("email", params.email);
  const query = qs.toString();
  return apiFetch<{ shipments: AdminShipment[]; limit: number }>(`/api/admin/shipments${query ? `?${query}` : ""}`);
}

export async function apiGetAdminBalanceMovements(params?: {
  limit?: number;
  type?: string;
  email?: string;
  trackingNumber?: string;
}): Promise<{ movements: AdminBalanceMovement[]; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.type) qs.set("type", params.type);
  if (params?.email) qs.set("email", params.email);
  if (params?.trackingNumber) qs.set("trackingNumber", params.trackingNumber);
  const query = qs.toString();
  return apiFetch<{ movements: AdminBalanceMovement[]; limit: number }>(`/api/admin/balance-movements${query ? `?${query}` : ""}`);
}

export async function apiGetAdminAuditEvents(params?: {
  limit?: number;
  severity?: string;
  eventType?: string;
}): Promise<{ events: AdminAuditEvent[]; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.eventType) qs.set("eventType", params.eventType);
  const query = qs.toString();
  return apiFetch<{ events: AdminAuditEvent[]; limit: number }>(`/api/admin/audit-events${query ? `?${query}` : ""}`);
}

export type AdminBalanceAdjustmentBody = {
  userId?: string;
  userEmail?: string;
  amount: number;
  reason: string;
  note?: string;
  idempotencyKey?: string;
};

export async function apiCreateAdminBalanceAdjustment(
  body: AdminBalanceAdjustmentBody,
): Promise<{ movement: AdminBalanceMovement; existing: boolean }> {
  return apiFetch<{ movement: AdminBalanceMovement; existing: boolean }>("/api/admin/balance-adjustments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Shipments ────────────────────────────────────────────────────────────────

export type ShipmentsData = { shipments: Envio[]; limit: number };

export async function apiGetShipments(params?: {
  limit?: number;
  status?: string;
  tracking_number?: string;
}): Promise<ShipmentsData> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.status) qs.set("status", params.status);
  if (params?.tracking_number) qs.set("tracking_number", params.tracking_number);
  const query = qs.toString();
  return apiFetch<ShipmentsData>(`/api/shipments${query ? `?${query}` : ""}`);
}

// ── Rates ────────────────────────────────────────────────────────────────────

export type RatesData = {
  mode?: string;
  rates: RateResult[];
  message?: string;
  configuredCount?: number;
  diagnostic?: "not_configured" | "address_incomplete" | "providers_failed" | "no_rates";
};

export type SSRatesBody = {
  provider: "shipstation";
  origin: { line1?: string; line2?: string; city: string; postalCode?: string; state?: string; country?: string };
  destination: { line1?: string; line2?: string; city: string; postalCode?: string; state?: string; country?: string };
  parcel: { weight: number; weightUnit?: string; length?: number; width?: number; height?: number; dimensionUnit?: string };
  courier?: string;
  cashOnDelivery?: boolean;
  cashAmount?: number;
};

export type AggregatedRatesBody = {
  mode: "best_available";
  origin: { line1?: string; line2?: string; city: string; postalCode?: string; state?: string; country?: string };
  destination: { line1?: string; line2?: string; city: string; postalCode?: string; state?: string; country?: string };
  parcel: { weight: number; weightUnit?: string; length?: number; width?: number; height?: number; dimensionUnit?: string };
  courier?: string;
  cashOnDelivery?: boolean;
  cashAmount?: number;
};

export type RatesBody = SSRatesBody | AggregatedRatesBody;

export async function apiGetRates(body: RatesBody): Promise<RatesData> {
  return apiFetch<RatesData>("/api/rates", { method: "POST", body: JSON.stringify(body) });
}

// ── Labels ───────────────────────────────────────────────────────────────────

export type CreateLabelBody = {
  provider: LogisticsProvider;
  providerRateId?: string;
  origin: { line1?: string; line2?: string; city: string; postalCode: string; state?: string; country?: string };
  destination: {
    city: string;
    postalCode: string;
    state?: string;
    country?: string;
    line1?: string;
    line2?: string;
  };
  parcel: { weight: number; weightUnit?: string; length?: number; width?: number; height?: number; dimensionUnit?: string };
  carrierCode: string;
  serviceCode: string;
  expectedCost?: number;                          // full customer price (providerCost + platformMarkup + paymentFee)
  platformMarkup?: number;                        // ShipFlow margin — persisted in shipments.platform_markup
  paymentFee?: number;                            // payment processing fee — persisted in shipments.payment_fee
  pricingSubtotal?: number;                       // providerCost + platformMarkup — persisted in shipments.pricing_subtotal
  pricingModel?: string;                          // formula identifier — persisted in shipments.pricing_model
  pricingBreakdown?: Record<string, unknown>;     // full calculation snapshot — persisted in shipments.pricing_breakdown
  labelFormat?: "pdf" | "zpl" | "png";
  idempotencyKey: string;
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  productType?: string;
};

export type CreateLabelResult = {
  shipment: Envio;
  trackingNumber: string;
  labelStatus: string;
  labelUrl: string | null;
  labelData: string | null;
  providerShipmentId: string | null;
  customerPrice: number;
  message: string;
};

export async function apiCreateLabel(body: CreateLabelBody): Promise<CreateLabelResult> {
  return apiFetch<CreateLabelResult>("/api/labels", { method: "POST", body: JSON.stringify(body) });
}

// ── Void label ───────────────────────────────────────────────────────────────

export type VoidData = {
  shipment: Envio;
  labelStatus: string;
  refunded: boolean;
  message: string;
};

export async function apiVoidLabel(shipmentId: string): Promise<VoidData> {
  return apiFetch<VoidData>(
    `/api/labels/${encodeURIComponent(shipmentId)}/void`,
    { method: "POST" },
  );
}

// ── Tracking ────────────────────────────────────────────────────────────────

export type BasicTrackingData = {
  shipment: Envio;
  shipmentId: string;
  trackingNumber: string;
  shipmentStatus: string;
  labelStatus: string | null;
  paymentStatus: string | null;
  carrier: string;
  service: string | null;
  recipientName: string;
  destinationCity: string;
  destinationAddress: string;
  createdAt: string;
  labelUrl: string | null;
  events: TrackingEvent[];
  message: string;
};

export async function apiGetTracking(trackingNumber: string): Promise<BasicTrackingData> {
  const qs = new URLSearchParams({ trackingNumber: trackingNumber.trim() });
  return apiFetch<BasicTrackingData>(`/api/tracking?${qs.toString()}`);
}
