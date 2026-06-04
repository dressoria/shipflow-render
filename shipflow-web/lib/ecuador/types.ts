export type EcuadorShipmentStatus =
  | "draft"
  | "quote_requested"
  | "quote_ready"
  | "awaiting_payment"
  | "paid"
  | "provider_pending"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "action_required"
  | "cancelled"
  | "failed";

export type EcuadorPaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "failed"
  | "refunded_manual";

export type EcuadorProvider = "delivereo" | "manual" | "mock";
export type EcuadorShipmentVisibility = "customer" | "internal";

export const ECUADOR_CUSTOMER_REQUEST_STATUSES = [
  "draft",
  "quote_requested",
  "quote_ready",
  "provider_pending",
  "pickup_scheduled",
  "picked_up",
  "in_transit",
  "delivered",
  "action_required",
  "cancelled",
  "failed",
] as const satisfies EcuadorShipmentStatus[];

export const ECUADOR_ADMIN_EDITABLE_STATUSES = [
  "quote_requested",
  "quote_ready",
  "action_required",
  "cancelled",
  "failed",
  "provider_pending",
  "pickup_scheduled",
  "picked_up",
  "in_transit",
  "delivered",
] as const satisfies EcuadorShipmentStatus[];

export const ECUADOR_REQUEST_PROVIDERS = [
  "manual",
  "mock",
] as const satisfies EcuadorProvider[];

export const ECUADOR_ADMIN_PROVIDERS = [
  "manual",
  "mock",
  "delivereo",
] as const satisfies EcuadorProvider[];

export type EcuadorAddressDraft = {
  name?: string;
  phone?: string;
  city?: string;
  addressLine?: string;
  reference?: string;
  lat?: number;
  lng?: number;
};

export type EcuadorShipmentDraft = {
  market: "EC";
  serviceType: "ecuador_delivery";
  origin: EcuadorAddressDraft;
  destination: EcuadorAddressDraft;
  packageDescription?: string;
  packageWeight?: number;
  packageDimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: "cm";
  };
  declaredValue?: number;
  notes?: string;
};

export type EcuadorQuoteInput = EcuadorShipmentDraft & {
  category?: "SMALL" | "MEDIUM" | "LARGE";
  language?: "es" | "en";
};

export type EcuadorQuoteResult = {
  provider: EcuadorProvider;
  status: EcuadorShipmentStatus;
  message: string;
  currency: "USD";
  providerCost?: number | null;
  customerPrice?: number | null;
  estimatedTime?: string | null;
  metadata?: Record<string, unknown>;
};

export type EcuadorQuoteRequestBody = CreateEcuadorShipmentRequestBody & {
  language?: "es" | "en";
  category?: "SMALL" | "MEDIUM" | "LARGE";
  originLatitude?: number;
  originLongitude?: number;
  destinationLatitude?: number;
  destinationLongitude?: number;
};

export type EcuadorCreateShipmentInput = EcuadorShipmentDraft & {
  idempotencyKey: string;
  paymentStatus: EcuadorPaymentStatus;
  paymentProvider: "ecuador_gateway" | "wallet" | "manual";
};

export type EcuadorCreateShipmentResult = {
  provider: EcuadorProvider;
  status: EcuadorShipmentStatus;
  message: string;
  providerOrderId?: string | null;
  trackingId?: string | null;
  metadata?: Record<string, unknown>;
};

export type EcuadorTrackingEvent = {
  code: string;
  label: string;
  description?: string;
  occurredAt?: string | null;
  status?: EcuadorShipmentStatus;
  metadata?: Record<string, unknown>;
};

export type EcuadorShipmentSummary = {
  id: string;
  userId?: string;
  provider: EcuadorProvider;
  status: EcuadorShipmentStatus;
  paymentStatus: EcuadorPaymentStatus;
  originCity?: string;
  destinationCity?: string;
  packageDescription?: string;
  providerOrderId?: string | null;
  trackingId?: string | null;
  customerPrice?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type EcuadorShipmentEvent = {
  id: string;
  visibility: EcuadorShipmentVisibility;
  status?: EcuadorShipmentStatus | null;
  title: string;
  message?: string | null;
  createdBy?: string | null;
  createdAt: string;
};

export type EcuadorShipmentRequest = {
  id: string;
  market: "EC";
  serviceType: "ecuador_delivery";
  provider: EcuadorProvider;
  status: EcuadorShipmentStatus;
  paymentStatus: EcuadorPaymentStatus;
  originName?: string | null;
  originPhone?: string | null;
  originAddress?: string | null;
  originCity?: string | null;
  originReference?: string | null;
  destinationName?: string | null;
  destinationPhone?: string | null;
  destinationAddress?: string | null;
  destinationCity?: string | null;
  destinationReference?: string | null;
  packageDescription?: string | null;
  packageWeight?: number | null;
  packageLength?: number | null;
  packageWidth?: number | null;
  packageHeight?: number | null;
  declaredValue?: number | null;
  customerNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  events?: EcuadorShipmentEvent[];
};

export type AdminEcuadorShipmentRequest = EcuadorShipmentRequest & {
  userId: string;
  providerStatus?: string | null;
  providerTrackingId?: string | null;
  providerOrderId?: string | null;
  customerPrice?: number | null;
  providerCost?: number | null;
  margin?: number | null;
  adminNotes?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type CreateEcuadorShipmentRequestBody = {
  provider?: EcuadorProvider;
  status?: EcuadorShipmentStatus;
  originName: string;
  originPhone: string;
  originAddress: string;
  originCity: string;
  originReference?: string;
  destinationName: string;
  destinationPhone: string;
  destinationAddress: string;
  destinationCity: string;
  destinationReference?: string;
  packageDescription: string;
  packageWeight: number;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  declaredValue?: number;
  customerNotes?: string;
};
