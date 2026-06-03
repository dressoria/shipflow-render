import type { EcuadorPaymentStatus, EcuadorShipmentStatus } from "@/lib/ecuador/types";

export const ECUADOR_COPY = {
  status: "Proximamente",
  preparation: "En preparación",
  earlyAccess: "Solicitar acceso temprano",
  usaLabels: "Ver Shipping Labels USA",
  providerPending: "Delivereo integration is pending.",
  notLive: "Aún no se crean envíos reales desde esta pantalla.",
  betaFormNote: "Esta solicitud no crea un envío real todavía.",
  betaReviewNote: "El equipo de SendiFlash la revisará para el acceso beta.",
  noProviderYet: "Delivereo no está integrado todavía.",
} as const;

const STATUS_LABELS: Record<EcuadorShipmentStatus, string> = {
  draft: "Borrador",
  quote_requested: "Solicitud recibida",
  quote_ready: "Cotización lista",
  awaiting_payment: "Pago pendiente",
  paid: "Pagado",
  provider_pending: "Pendiente de proveedor",
  pickup_scheduled: "Retiro programado",
  picked_up: "Retirado",
  in_transit: "En tránsito",
  delivered: "Entregado",
  action_required: "Acción requerida",
  cancelled: "Cancelado",
  failed: "Fallido",
};

const STATUS_TONES: Record<EcuadorShipmentStatus, "blue" | "green" | "amber" | "slate"> = {
  draft: "slate",
  quote_requested: "blue",
  quote_ready: "green",
  awaiting_payment: "amber",
  paid: "green",
  provider_pending: "amber",
  pickup_scheduled: "blue",
  picked_up: "blue",
  in_transit: "blue",
  delivered: "green",
  action_required: "amber",
  cancelled: "slate",
  failed: "amber",
};

const PAYMENT_LABELS: Record<EcuadorPaymentStatus, string> = {
  unpaid: "Sin pago",
  pending: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  refunded_manual: "Reembolso manual",
};

export function getEcuadorStatusLabel(status: EcuadorShipmentStatus) {
  return STATUS_LABELS[status] ?? status;
}

export function getEcuadorStatusTone(status: EcuadorShipmentStatus) {
  return STATUS_TONES[status] ?? "slate";
}

export function getEcuadorPaymentLabel(status: EcuadorPaymentStatus) {
  return PAYMENT_LABELS[status] ?? status;
}

export function getEcuadorStatusEventTitle(status: EcuadorShipmentStatus) {
  switch (status) {
    case "quote_requested":
      return "Solicitud Ecuador recibida";
    case "quote_ready":
      return "Cotización Ecuador disponible";
    case "action_required":
      return "Se requiere información adicional";
    case "cancelled":
      return "Solicitud cancelada";
    case "failed":
      return "Solicitud con incidencia";
    case "provider_pending":
      return "Pendiente de activación con proveedor";
    case "pickup_scheduled":
      return "Retiro programado";
    case "picked_up":
      return "Paquete retirado";
    case "in_transit":
      return "Solicitud en tránsito";
    case "delivered":
      return "Entrega confirmada";
    case "awaiting_payment":
      return "Pago pendiente";
    case "paid":
      return "Pago confirmado";
    case "draft":
    default:
      return "Solicitud actualizada";
  }
}
