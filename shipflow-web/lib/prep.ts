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
