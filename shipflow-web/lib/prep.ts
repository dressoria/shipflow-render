import type { PrepOrder, PrepOrderStatus } from "@/lib/types";

export const PREP_BASE_UNIT_PRICE_CENTS = 65;
export const PREP_MAX_ITEMS = 20;

export const PREP_STATUSES: PrepOrderStatus[] = [
  "quote_requested",
  "under_review",
  "awaiting_inventory",
  "inventory_received",
  "prep_in_progress",
  "action_required",
  "ready_to_ship_to_amazon",
  "shipped_to_amazon",
  "completed",
  "cancelled",
];

export const PREP_SERVICE_OPTIONS = [
  "FNSKU labeling",
  "Poly bagging",
  "Bubble wrap",
  "Bundling",
  "Kitting",
  "Inspection",
  "Case forwarding",
  "Temporary storage",
  "Other",
];

export function getPrepStatusLabel(status: PrepOrderStatus | string) {
  const labels: Record<string, string> = {
    quote_requested: "Quote requested",
    under_review: "Under review",
    awaiting_inventory: "Awaiting inventory",
    inventory_received: "Inventory received",
    prep_in_progress: "Prep in progress",
    action_required: "Action required",
    ready_to_ship_to_amazon: "Ready to ship to Amazon",
    shipped_to_amazon: "Shipped to Amazon",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

export function getPrepStatusEventTitle(status: PrepOrderStatus | string) {
  return getPrepStatusLabel(status);
}

export function getPrepNextStep(status: PrepOrderStatus | string, receivingReference?: string | null) {
  const steps: Record<string, string> = {
    quote_requested: "SendiFlash is reviewing your request and will confirm quote details.",
    under_review: "Our operations team is reviewing services, unit counts, and handling needs.",
    awaiting_inventory: receivingReference
      ? "Send inventory using the receiving reference provided by SendiFlash."
      : "SendiFlash will share receiving instructions when the quote is ready.",
    inventory_received: "Inventory has been received and will move into prep review.",
    prep_in_progress: "Prep work is in progress. Customer-visible updates will appear in the timeline.",
    action_required: "SendiFlash needs additional information before continuing.",
    ready_to_ship_to_amazon: "Your inventory is prepped and ready for the next Amazon FBA forwarding step.",
    shipped_to_amazon: "Your inventory has been forwarded toward Amazon FBA.",
    completed: "This Prep order is complete.",
    cancelled: "This Prep order was cancelled.",
  };
  return steps[status] ?? "SendiFlash will share the next step soon.";
}

export function shouldShowReceivingReference(status: PrepOrderStatus | string) {
  return [
    "awaiting_inventory",
    "inventory_received",
    "prep_in_progress",
    "ready_to_ship_to_amazon",
    "shipped_to_amazon",
    "completed",
  ].includes(status);
}

export function getPrepStatusTone(status: PrepOrderStatus | string): "blue" | "green" | "amber" | "slate" {
  if (status === "completed" || status === "shipped_to_amazon") return "green";
  if (status === "action_required" || status === "awaiting_inventory") return "amber";
  if (status === "cancelled") return "slate";
  if (status === "quote_requested" || status === "under_review" || status === "prep_in_progress") return "blue";
  return "slate";
}

export function calculatePrepEstimateCents(totalUnits: number, unitPriceCents = PREP_BASE_UNIT_PRICE_CENTS) {
  const safeUnits = Math.max(Math.trunc(Number(totalUnits) || 0), 0);
  return safeUnits * unitPriceCents;
}

export function isPrepTerminalStatus(status: PrepOrder["status"]) {
  return status === "completed" || status === "cancelled";
}

export function getPrepPaymentStatusLabel(status?: string | null) {
  if (!status || status === "unpaid") return "Unpaid";
  if (status === "pending") return "Payment pending";
  if (status === "paid") return "Paid";
  if (status === "failed") return "Payment failed";
  if (status === "refunded_manual") return "Refunded manually";
  return status.replaceAll("_", " ");
}

export function getPrepPaymentTone(status?: string | null): "blue" | "green" | "amber" | "slate" {
  if (status === "paid") return "green";
  if (status === "pending") return "amber";
  if (status === "failed") return "amber";
  return "slate";
}

export function canPayPrepOrder(order: Pick<PrepOrder, "status" | "finalTotal" | "paymentStatus">) {
  const finalTotal = Number(order.finalTotal ?? 0);
  return (
    finalTotal > 0 &&
    order.status !== "cancelled" &&
    order.status !== "completed" &&
    (order.paymentStatus === "unpaid" || order.paymentStatus === "failed" || !order.paymentStatus)
  );
}
