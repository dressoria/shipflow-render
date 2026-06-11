import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type {
  Envio,
  MovimientoSaldo,
  TrackingEvent,
  Usuario,
  PendingLabelOrderRateSnapshot,
  PendingLabelOrderParcel,
  StructuredAddress,
} from "@/lib/types";
import type { LogisticsProvider, RateResult } from "@/lib/logistics/types";

async function getToken(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
  details?: string | null;
  stage?: string | null;
  status?: number | null;
  providerMessage?: string | null;
};

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const existingHeaders = (init.headers ?? {}) as Record<string, string>;
  const res = await fetch(path, { ...init, headers: { ...headers, ...existingHeaders } });
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !json.success) {
    const parts = [
      json.error,
      json.stage ? `Etapa: ${json.stage}.` : null,
      json.details,
      json.providerMessage ? `Mensaje proveedor: ${json.providerMessage}.` : null,
    ].filter(Boolean);
    throw new Error(parts.join(" ") || `API error (${res.status})`);
  }
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
  stripeRechargeConfigured: boolean;
  stripeRechargeEnabled: boolean;
  activeRateProviders: number;
  labelPurchaseEnabled: boolean;
  realLabelPurchaseEnabled?: boolean;
  labelVoidEnabled: boolean;
  directLabelPaymentEnabled: boolean;
  processLabelInWebhookEnabled?: boolean;
  labelPaymentRefundsEnabled?: boolean;
  // Build-env diagnostics (FASE 5.38C)
  appUrlConfigured: boolean;
  appUrlHost: string | null;
  buildEnvOk: boolean;
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
      stripeRechargeConfigured: false,
      stripeRechargeEnabled: false,
      activeRateProviders: 0,
      labelPurchaseEnabled: false,
      labelVoidEnabled: false,
      directLabelPaymentEnabled: false,
      processLabelInWebhookEnabled: false,
      labelPaymentRefundsEnabled: false,
      appUrlConfigured: false,
      appUrlHost: null,
      buildEnvOk: false,
    };
  }
  return json.data;
}

export type ConfigFeatures = {
  directLabelPaymentAvailable: boolean;
  realLabelPurchaseAvailable: boolean;
  realVoidAvailable: boolean;
  labelPaymentRefundAvailable?: boolean;
};

export async function apiGetConfigFeatures(): Promise<ConfigFeatures> {
  return apiFetch<ConfigFeatures>("/api/config/features");
}

// ── Auth/me ──────────────────────────────────────────────────────────────────

export type AuthMeResult = {
  authenticated: boolean;
  id?: string;
  email?: string | null;
  emailVerified?: boolean;
};

// Returns who is actually authenticated server-side for the current session.
// Safe for debugging production session/user mismatches.
export async function apiGetAuthMe(): Promise<AuthMeResult> {
  return apiFetch<AuthMeResult>("/api/auth/me");
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

export async function apiCreateCheckoutSession(amount: number): Promise<{ checkoutUrl: string }> {
  return apiFetch<{ checkoutUrl: string }>("/api/billing/checkout-session", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

// ── Label direct payment ──────────────────────────────────────────────────────

export type LabelCheckoutBody = {
  provider: string;
  serviceCode?: string;
  serviceName?: string;
  rateSnapshot: PendingLabelOrderRateSnapshot;
  origin: StructuredAddress;
  destination: StructuredAddress;
  parcel: PendingLabelOrderParcel;
  idempotencyKey?: string;
};

export type LabelCheckoutResult = {
  checkoutUrl: string;
  pendingLabelOrderId: string;
};

export async function apiCreateLabelCheckoutSession(
  body: LabelCheckoutBody,
): Promise<LabelCheckoutResult> {
  return apiFetch<LabelCheckoutResult>("/api/billing/label-checkout", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type UserLabelOrderStatus = {
  id: string;
  status: import("@/lib/types").PendingLabelOrderStatus;
  provider: string;
  serviceCode: string | null;
  serviceName: string | null;
  amountCents: number;
  currency: string;
  trackingNumber: string | null;
  labelUrl: string | null;
  labelId: string | null;
  shipmentId: string | null;
  errorMessage: string | null;
  paidAt: string | null;
  processedAt: string | null;
  createdAt: string;
  expiresAt: string;
};

export async function apiGetUserLabelOrder(id: string): Promise<UserLabelOrderStatus> {
  return apiFetch<UserLabelOrderStatus>(
    `/api/billing/label-orders/${encodeURIComponent(id)}`,
  );
}

// ── Admin label orders ────────────────────────────────────────────────────────

export type AdminLabelOrdersResult = {
  orders: import("@/lib/types").PendingLabelOrder[];
  total: number;
  limit: number;
  offset: number;
  warning?: string;
};

export async function apiGetAdminLabelOrders(params?: {
  status?: string;
  provider?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminLabelOrdersResult> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.provider) qs.set("provider", params.provider);
  if (params?.search) qs.set("search", params.search);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return apiFetch<AdminLabelOrdersResult>(`/api/admin/label-orders${query ? `?${query}` : ""}`);
}

export async function apiGetAdminLabelOrderById(
  id: string,
): Promise<{ order: import("@/lib/types").PendingLabelOrder }> {
  return apiFetch<{ order: import("@/lib/types").PendingLabelOrder }>(
    `/api/admin/label-orders/${encodeURIComponent(id)}`,
  );
}

export async function apiAdminMarkLabelOrderActionRequired(
  id: string,
  reason: string,
): Promise<{ order: import("@/lib/types").PendingLabelOrder }> {
  return apiFetch<{ order: import("@/lib/types").PendingLabelOrder }>(
    `/api/admin/label-orders/${encodeURIComponent(id)}/mark-action-required`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
}

export async function apiAdminMarkLabelOrderRefundNeeded(
  id: string,
  reason: string,
): Promise<{ order: import("@/lib/types").PendingLabelOrder }> {
  return apiFetch<{ order: import("@/lib/types").PendingLabelOrder }>(
    `/api/admin/label-orders/${encodeURIComponent(id)}/mark-refund-needed`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
}

export async function apiAdminMarkLabelOrderExpired(
  id: string,
): Promise<{ order: import("@/lib/types").PendingLabelOrder }> {
  return apiFetch<{ order: import("@/lib/types").PendingLabelOrder }>(
    `/api/admin/label-orders/${encodeURIComponent(id)}/mark-expired`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function apiAdminExpireStaleLabelOrders(): Promise<{ expiredCount: number }> {
  return apiFetch<{ expiredCount: number }>("/api/admin/label-orders/expire-stale", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function apiAdminGetLabelOrder(
  id: string,
): Promise<{ order: import("@/lib/types").PendingLabelOrder }> {
  return apiFetch<{ order: import("@/lib/types").PendingLabelOrder }>(
    `/api/admin/label-orders/${encodeURIComponent(id)}`,
  );
}

export type AdminProcessLabelResult = {
  orderId: string;
  shipmentId: string;
  trackingNumber: string;
  labelUrl: string | null;
  providerLabelId: string | null;
  providerShipmentId: string | null;
  triggeredBy: string;
};

export async function apiAdminProcessLabelOrder(
  id: string,
  opts?: { allowTestMode?: boolean },
): Promise<AdminProcessLabelResult> {
  const qs = opts?.allowTestMode ? "?allow_test_mode=1" : "";
  return apiFetch<AdminProcessLabelResult>(
    `/api/admin/label-orders/${encodeURIComponent(id)}/process-label${qs}`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function apiAdminRefundLabelOrder(
  id: string,
  body: { reason: string; confirmation: "REFUND" },
): Promise<{ order: import("@/lib/types").PendingLabelOrder }> {
  return apiFetch<{ order: import("@/lib/types").PendingLabelOrder }>(
    `/api/admin/label-orders/${encodeURIComponent(id)}/refund`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function apiAdminMarkLabelOrderRefundedManual(
  id: string,
  reason: string,
): Promise<{ order: import("@/lib/types").PendingLabelOrder }> {
  return apiFetch<{ order: import("@/lib/types").PendingLabelOrder }>(
    `/api/admin/label-orders/${encodeURIComponent(id)}/mark-refunded-manual`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
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

// ── SendiFlash Prep ─────────────────────────────────────────────────────────

export type CreatePrepOrderBody = {
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

export async function apiCreatePrepOrder(body: CreatePrepOrderBody): Promise<{ order: import("@/lib/types").PrepOrder }> {
  return apiFetch<{ order: import("@/lib/types").PrepOrder }>("/api/prep-orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiGetPrepOrders(params?: { status?: string; limit?: number }): Promise<{ orders: import("@/lib/types").PrepOrder[]; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiFetch<{ orders: import("@/lib/types").PrepOrder[]; limit: number }>(`/api/prep-orders${query ? `?${query}` : ""}`);
}

export async function apiGetPrepOrder(id: string): Promise<{ order: import("@/lib/types").PrepOrder }> {
  return apiFetch<{ order: import("@/lib/types").PrepOrder }>(`/api/prep-orders/${encodeURIComponent(id)}`);
}

export async function apiPayPrepOrderWithWallet(id: string): Promise<{ order: import("@/lib/types").PrepOrder; movementId: string }> {
  return apiFetch<{ order: import("@/lib/types").PrepOrder; movementId: string }>(`/api/prep-orders/${encodeURIComponent(id)}/pay-wallet`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function apiCreatePrepOrderCheckout(id: string): Promise<{ checkoutUrl: string; order: import("@/lib/types").PrepOrder }> {
  return apiFetch<{ checkoutUrl: string; order: import("@/lib/types").PrepOrder }>(`/api/prep-orders/${encodeURIComponent(id)}/checkout`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function apiGetAdminPrepOrders(params?: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<{ orders: import("@/lib/types").PrepOrder[]; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.search) qs.set("search", params.search);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiFetch<{ orders: import("@/lib/types").PrepOrder[]; limit: number }>(`/api/admin/prep-orders${query ? `?${query}` : ""}`);
}

export async function apiGetAdminPrepOrder(id: string): Promise<{ order: import("@/lib/types").PrepOrder }> {
  return apiFetch<{ order: import("@/lib/types").PrepOrder }>(`/api/admin/prep-orders/${encodeURIComponent(id)}`);
}

export async function apiUpdateAdminPrepOrder(
  id: string,
  body: Record<string, unknown>,
): Promise<{ order: import("@/lib/types").PrepOrder }> {
  return apiFetch<{ order: import("@/lib/types").PrepOrder }>(`/api/admin/prep-orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiCreateAdminPrepOrderEvent(
  id: string,
  body: { visibility: "customer" | "internal"; status?: string; title: string; message?: string },
): Promise<{ order: import("@/lib/types").PrepOrder }> {
  return apiFetch<{ order: import("@/lib/types").PrepOrder }>(`/api/admin/prep-orders/${encodeURIComponent(id)}/events`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Ecuador Shipping beta requests ──────────────────────────────────────────

export type CreateEcuadorShipmentRequestBody = import("@/lib/ecuador/types").CreateEcuadorShipmentRequestBody;
export type EcuadorQuoteRequestBody = import("@/lib/ecuador/types").EcuadorQuoteRequestBody;
export type EcuadorProviderQuoteResult = import("@/lib/ecuador/providers/types").EcuadorProviderQuoteResult;

export async function apiCreateEcuadorShipmentRequest(
  body: CreateEcuadorShipmentRequestBody,
): Promise<{ shipment: import("@/lib/ecuador/types").EcuadorShipmentRequest; message: string }> {
  return apiFetch<{ shipment: import("@/lib/ecuador/types").EcuadorShipmentRequest; message: string }>("/api/ecuador/shipments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiGetEcuadorQuotes(
  body: EcuadorQuoteRequestBody,
): Promise<{
  results: EcuadorProviderQuoteResult[];
  summary: {
    totalProviders: number;
    realQuotesCount: number;
    pendingProvidersCount: number;
    failedProvidersCount: number;
  };
  beta: boolean;
  message: string;
}> {
  return apiFetch<{
    results: EcuadorProviderQuoteResult[];
    summary: {
      totalProviders: number;
      realQuotesCount: number;
      pendingProvidersCount: number;
      failedProvidersCount: number;
    };
    beta: boolean;
    message: string;
  }>("/api/ecuador/quotes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiGetEcuadorShipmentRequests(params?: {
  status?: string;
  limit?: number;
}): Promise<{ shipments: import("@/lib/ecuador/types").EcuadorShipmentRequest[]; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiFetch<{ shipments: import("@/lib/ecuador/types").EcuadorShipmentRequest[]; limit: number }>(
    `/api/ecuador/shipments${query ? `?${query}` : ""}`,
  );
}

export async function apiGetEcuadorShipmentRequest(
  id: string,
): Promise<{ shipment: import("@/lib/ecuador/types").EcuadorShipmentRequest }> {
  return apiFetch<{ shipment: import("@/lib/ecuador/types").EcuadorShipmentRequest }>(
    `/api/ecuador/shipments/${encodeURIComponent(id)}`,
  );
}

export async function apiGetAdminEcuadorShipments(params?: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<{ shipments: import("@/lib/ecuador/types").AdminEcuadorShipmentRequest[]; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.search) qs.set("search", params.search);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiFetch<{ shipments: import("@/lib/ecuador/types").AdminEcuadorShipmentRequest[]; limit: number }>(
    `/api/admin/ecuador-shipments${query ? `?${query}` : ""}`,
  );
}

export async function apiGetAdminEcuadorShipment(
  id: string,
): Promise<{ shipment: import("@/lib/ecuador/types").AdminEcuadorShipmentRequest }> {
  return apiFetch<{ shipment: import("@/lib/ecuador/types").AdminEcuadorShipmentRequest }>(
    `/api/admin/ecuador-shipments/${encodeURIComponent(id)}`,
  );
}

export async function apiUpdateAdminEcuadorShipment(
  id: string,
  body: Record<string, unknown>,
): Promise<{ shipment: import("@/lib/ecuador/types").AdminEcuadorShipmentRequest | null }> {
  return apiFetch<{ shipment: import("@/lib/ecuador/types").AdminEcuadorShipmentRequest | null }>(
    `/api/admin/ecuador-shipments/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function apiTestAdminDelivereoAuth(): Promise<{
  snapshots: import("@/lib/ecuador/providerHealth").EcuadorProviderDiagnosticsSnapshot[];
  ok: boolean;
  message: string;
}> {
  return apiFetch<{
    snapshots: import("@/lib/ecuador/providerHealth").EcuadorProviderDiagnosticsSnapshot[];
    ok: boolean;
    message: string;
  }>("/api/admin/ecuador/providers/delivereo/test-auth", {
    method: "POST",
    body: JSON.stringify({}),
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
  productDescription?: string;
  courier?: string;
  cashOnDelivery?: boolean;
  cashAmount?: number;
};

export type AggregatedRatesBody = {
  mode: "best_available";
  origin: { line1?: string; line2?: string; city: string; postalCode?: string; state?: string; country?: string };
  destination: { line1?: string; line2?: string; city: string; postalCode?: string; state?: string; country?: string };
  parcel: { weight: number; weightUnit?: string; length?: number; width?: number; height?: number; dimensionUnit?: string };
  productDescription?: string;
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
