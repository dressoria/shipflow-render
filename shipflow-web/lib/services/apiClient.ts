import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Envio } from "@/lib/types";
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

// ── Balance ─────────────────────────────────────────────────────────────────

export type BalanceMovement = {
  id: string;
  concept: string;
  amount: number;
  date: string;
  type?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  shipmentId?: string | null;
};

export type BalanceData = {
  balance: number;
  currency: string;
  recentMovements: BalanceMovement[];
};

export async function apiGetBalance(): Promise<BalanceData> {
  return apiFetch<BalanceData>("/api/balance");
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
  queriedProviders?: string[];
  configuredCount?: number;
};

export type SSRatesBody = {
  provider: "shipstation";
  origin: { city: string; postalCode?: string; state?: string; country?: string };
  destination: { city: string; postalCode?: string; state?: string; country?: string };
  parcel: { weight: number; weightUnit?: string };
  courier?: string;
  cashOnDelivery?: boolean;
  cashAmount?: number;
};

export type AggregatedRatesBody = {
  mode: "best_available";
  origin: { city: string; postalCode?: string; state?: string; country?: string };
  destination: { city: string; postalCode?: string; state?: string; country?: string };
  parcel: { weight: number; weightUnit?: string };
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
  origin: { city: string; postalCode: string; state?: string; country?: string };
  destination: {
    city: string;
    postalCode: string;
    state?: string;
    country?: string;
    line1?: string;
  };
  parcel: { weight: number; weightUnit?: string };
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
