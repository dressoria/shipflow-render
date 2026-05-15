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
};

export type MovimientoSaldo = {
  id: string;
  userId?: string;
  concept: string;
  date: string;
  amount: number;
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
