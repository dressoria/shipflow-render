// Shared label order status helpers — no server imports, safe for client and server.
// Single source of truth for which statuses allow which operations.

import type { PendingLabelOrderStatus } from "@/lib/types";

// ── Status sets ──────────────────────────────────────────────────────────────

export const FINAL_LABEL_ORDER_STATUSES: PendingLabelOrderStatus[] = [
  "label_purchased",
  "refunded",
  "expired",
  "canceled",
];

export const CAN_PROCESS_LABEL_STATUSES: PendingLabelOrderStatus[] = [
  "paid_waiting_label_purchase",
  "label_purchase_pending",
  "action_required",
];

export const CAN_MARK_ACTION_REQUIRED_STATUSES: PendingLabelOrderStatus[] = [
  "pending_payment",
  "paid_test_mode",
  "paid_waiting_label_purchase",
  "label_purchase_pending",
];

export const CAN_MARK_REFUND_NEEDED_STATUSES: PendingLabelOrderStatus[] = [
  "paid_test_mode",
  "paid_waiting_label_purchase",
  "label_purchase_pending",
  "action_required",
];

export const CAN_REFUND_LABEL_ORDER_STATUSES: PendingLabelOrderStatus[] = [
  "refund_needed",
  "action_required",
  "paid_test_mode",
  "paid_waiting_label_purchase",
];

export const CAN_MARK_REFUNDED_MANUAL_STATUSES: PendingLabelOrderStatus[] = [
  "refund_needed",
  "refund_pending",
  "paid_test_mode",
  "action_required",
  "paid_waiting_label_purchase",
];

// ── Guard functions ──────────────────────────────────────────────────────────

export function isFinalLabelOrderStatus(status: PendingLabelOrderStatus): boolean {
  return FINAL_LABEL_ORDER_STATUSES.includes(status);
}

export function canProcessLabelOrder(status: PendingLabelOrderStatus): boolean {
  return CAN_PROCESS_LABEL_STATUSES.includes(status);
}

export function canMarkActionRequired(status: PendingLabelOrderStatus): boolean {
  return CAN_MARK_ACTION_REQUIRED_STATUSES.includes(status);
}

export function canMarkRefundNeeded(status: PendingLabelOrderStatus): boolean {
  return CAN_MARK_REFUND_NEEDED_STATUSES.includes(status);
}

export function canRefundLabelOrder(status: PendingLabelOrderStatus): boolean {
  return CAN_REFUND_LABEL_ORDER_STATUSES.includes(status);
}

export function canMarkRefundedManual(status: PendingLabelOrderStatus): boolean {
  return CAN_MARK_REFUNDED_MANUAL_STATUSES.includes(status);
}

// ── Display helpers ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PendingLabelOrderStatus, string> = {
  pending_payment: "Pending payment",
  paid_test_mode: "Paid (test mode)",
  paid_waiting_label_purchase: "Paid — awaiting label",
  label_purchase_pending: "Label processing",
  label_purchased: "Label purchased",
  action_required: "Action required",
  refund_needed: "Refund needed",
  refund_pending: "Refund pending",
  refunded: "Refunded",
  expired: "Expired",
  canceled: "Canceled",
};

const STATUS_DESCRIPTIONS: Record<PendingLabelOrderStatus, string> = {
  pending_payment: "Checkout session created but payment not yet received.",
  paid_test_mode: "Payment confirmed in Stripe test mode. No carrier label was purchased.",
  paid_waiting_label_purchase: "Payment confirmed. Label purchase is queued for processing.",
  label_purchase_pending: "Label purchase is being processed with the carrier.",
  label_purchased: "Carrier label purchased and ready for download.",
  action_required: "Order requires support review before proceeding.",
  refund_needed: "Label could not be purchased. A refund is required.",
  refund_pending: "Stripe refund initiated and being processed.",
  refunded: "Stripe refund completed successfully.",
  expired: "Checkout session expired without payment.",
  canceled: "Order was canceled.",
};

const USER_FACING_MESSAGES: Record<PendingLabelOrderStatus, string> = {
  pending_payment: "Your payment has not been completed yet.",
  paid_test_mode:
    "Payment confirmed in test mode. Label purchase is disabled, so no label was generated.",
  paid_waiting_label_purchase: "Payment confirmed. Your label is waiting for processing.",
  label_purchase_pending: "Your label is being processed.",
  label_purchased: "Your label is ready.",
  action_required:
    "Your payment was received, but this shipment needs support review before a label can be generated.",
  refund_needed:
    "Your payment was received, but the label could not be generated. Support will review this order.",
  refund_pending: "Refund is being processed.",
  refunded: "Refund completed.",
  expired: "This payment attempt expired.",
  canceled: "This order was canceled.",
};

export function getLabelOrderStatusLabel(status: PendingLabelOrderStatus): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function getLabelOrderStatusDescription(status: PendingLabelOrderStatus): string {
  return STATUS_DESCRIPTIONS[status] ?? "";
}

export function getUserFacingLabelOrderMessage(status: PendingLabelOrderStatus): string {
  return USER_FACING_MESSAGES[status] ?? "Your label order is being processed.";
}

// ── Status classification ────────────────────────────────────────────────────

export function isErrorLabelOrderStatus(status: PendingLabelOrderStatus): boolean {
  return (
    status === "action_required" ||
    status === "refund_needed" ||
    status === "refund_pending" ||
    status === "refunded" ||
    status === "expired" ||
    status === "canceled"
  );
}
