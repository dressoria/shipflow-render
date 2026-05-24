export type ShipmentStatus = "Entregado" | "En tránsito" | "Pendiente";
export type StandardTrackingStatus =
  | "pendiente"
  | "recolectado"
  | "en_transito"
  | "en_reparto"
  | "entregado"
  | "novedad"
  | "devuelto"
  | "cancelado";
export type UserRole = "user" | "admin";

export type Usuario = {
  id: string;
  email: string;
  businessName?: string;
  role: UserRole;
  createdAt: string;
  emailVerified?: boolean;
};

export type Envio = {
  id: string;
  userId?: string;
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  originCity: string;
  recipientName: string;
  recipientPhone: string;
  destinationCity: string;
  destinationAddress: string;
  weight: number;
  productType: string;
  courier: string;
  shippingSubtotal?: number;
  cashOnDeliveryCommission?: number;
  total?: number;
  cashOnDelivery: boolean;
  cashAmount: number;
  status: ShipmentStatus;
  date: string;
  value: number;
  // Provider/logistics fields — populated when FASE 1C migration is applied
  provider?: string | null;
  labelStatus?: string | null;
  paymentStatus?: string | null;
  customerPrice?: number | null;
  providerShipmentId?: string | null;
  providerLabelId?: string | null;
  providerRateId?: string | null;
  providerServiceCode?: string | null;
  labelUrl?: string | null;
  // FASE 5.10: pricing breakdown — populated when FASE 5.10 migration is applied
  providerCost?: number | null;
  platformMarkup?: number | null;
  paymentFee?: number | null;
  pricingSubtotal?: number | null;
  pricingModel?: string | null;
  pricingBreakdown?: Record<string, unknown> | null;
};

export type MovimientoSaldo = {
  id: string;
  userId?: string;
  concept: string;
  date: string;
  amount: number;
  type?: "recharge" | "debit" | "refund" | "adjustment" | "fee" | string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  shipmentId?: string | null;
};

export type Courier = {
  id: string;
  name: string;
  coverage: string;
  status: "Conectado" | "Próximo";
  initials: string;
};

export type CourierConfig = {
  id: string;
  nombre: string;
  activo: boolean;
  logoUrl: string;
  cobertura: string;
  precioBase: number;
  precioPorKg: number;
  permiteContraEntrega: boolean;
  comisionContraEntrega: number;
  tiempoEstimado: string;
  notas: string;
};

export type ShippingRate = {
  courier: CourierConfig;
  subtotal: number;
  contraEntregaComision: number;
  total: number;
};

export type TrackingEvent = {
  id: string;
  shipmentId: string;
  trackingNumber: string;
  title: string;
  description?: string;
  status: ShipmentStatus;
  date: string;
};

export type RealTrackingEvent = {
  id: string;
  title: string;
  description?: string;
  status: StandardTrackingStatus;
  statusLabel: string;
  location?: string;
  date?: string;
};

export type TrackingStatus = {
  trackingNumber: string;
  courier: string;
  status: StandardTrackingStatus;
  statusLabel: string;
  currentLocation?: string;
  lastUpdate?: string;
  events: RealTrackingEvent[];
  source: string;
  isReal: boolean;
  message?: string;
};

export type TrackingResult = TrackingStatus;

export type AddressSource = "manual" | "google_places" | "map_pin";
export type AddressValidationStatus = "complete" | "incomplete" | "needs_review";

export type StructuredAddress = {
  name?: string;
  phone?: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  placeId?: string;
  source?: AddressSource;
  validationStatus?: AddressValidationStatus;
};

// ── FASE 5.39 — Label direct payment (scaffold, not yet active) ─────────────

export type PendingLabelOrderStatus =
  | "pending_payment"
  | "payment_confirmed"
  | "label_purchased"
  | "label_failed"
  | "refund_needed"
  | "refunded"
  | "expired"
  | "canceled";

export type PendingLabelOrderParcel = {
  weight: number;
  weightUnit: "lb" | "oz" | "kg" | "g";
  length: number;
  width: number;
  height: number;
  dimensionUnit: "in" | "cm";
};

export type PendingLabelOrderRateSnapshot = {
  provider: string;
  serviceCode: string;
  carrierCode: string;
  providerRateId?: string;
  providerCost: number;
  customerPrice: number;
  currency: string;
  pricingBreakdown?: Record<string, unknown>;
};

export type PendingLabelOrder = {
  id: string;
  userId: string;
  status: PendingLabelOrderStatus;
  rateSnapshot: PendingLabelOrderRateSnapshot;
  origin: StructuredAddress;
  destination: StructuredAddress;
  parcel: PendingLabelOrderParcel;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  shipmentId?: string;
  labelId?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};
