import { getStripeClient } from "@/lib/server/stripe";
import {
  getPendingLabelOrderByIdForAdmin,
  markPendingLabelOrderRefundFailed,
  markPendingLabelOrderRefundPending,
  markPendingLabelOrderRefunded,
} from "@/lib/server/pendingLabelOrders";
import { createAuditLog } from "@/lib/server/auditLog";
import type { PendingLabelOrder } from "@/lib/types";

const REFUNDABLE_STATUSES = [
  "refund_needed",
  "action_required",
  "paid_test_mode",
  "paid_waiting_label_purchase",
] as const;

const MANUAL_REFUNDED_STATUSES = [
  "refund_needed",
  "refund_pending",
  "paid_test_mode",
  "action_required",
  "paid_waiting_label_purchase",
] as const;

export function validateOrderRefundEligibility(order: PendingLabelOrder): void {
  if (order.status === "refunded") {
    throw new Error("This label payment is already refunded.");
  }
  if (order.status === "refund_pending") {
    throw new Error("This label payment refund is already pending.");
  }
  if (order.status === "label_purchased") {
    throw new Error("Direct refund for purchased labels is not supported yet. Void/return policy must be handled first.");
  }
  if (!REFUNDABLE_STATUSES.includes(order.status as (typeof REFUNDABLE_STATUSES)[number])) {
    throw new Error(`Order status '${order.status}' is not eligible for refund.`);
  }
  if (!order.stripePaymentIntentId) {
    throw new Error("This order has no Stripe payment intent and cannot be refunded.");
  }
  if (!order.paidAt) {
    throw new Error("This order has no paid_at timestamp and cannot be refunded.");
  }
  if (!Number.isFinite(order.amountCents) || order.amountCents <= 0) {
    throw new Error("This order has an invalid amount and cannot be refunded.");
  }
  if (order.labelId || order.trackingNumber) {
    throw new Error("This order already has label data and cannot be refunded directly yet.");
  }
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown refund error.");
  return message.slice(0, 500);
}

export async function createStripeRefundForPendingLabelOrder(
  orderId: string,
  opts: {
    adminUserId: string;
    adminEmail?: string | null;
    reason: string;
  },
): Promise<PendingLabelOrder> {
  const order = await getPendingLabelOrderByIdForAdmin(orderId);
  if (!order) throw new Error("Order not found.");

  if (order.status === "refunded") {
    return order;
  }

  validateOrderRefundEligibility(order);

  await createAuditLog({
    actorUserId: opts.adminUserId,
    actorEmail: opts.adminEmail ?? null,
    userId: order.userId,
    eventType: "label_refund_requested",
    severity: "info",
    entityType: "balance_movement",
    entityId: order.id,
    provider: order.provider,
    message: "Admin requested Stripe refund for direct label payment.",
    metadata: {
      orderId: order.id,
      amountCents: order.amountCents,
      status: order.status,
    },
  });

  await markPendingLabelOrderRefundPending(order.id, `[refund requested] ${opts.reason}`);
  await createAuditLog({
    actorUserId: opts.adminUserId,
    actorEmail: opts.adminEmail ?? null,
    userId: order.userId,
    eventType: "label_refund_pending",
    severity: "info",
    entityType: "balance_movement",
    entityId: order.id,
    provider: order.provider,
    message: "Pending label order marked refund_pending before Stripe refund call.",
    metadata: { orderId: order.id },
  });

  try {
    const refund = await getStripeClient().refunds.create(
      {
        payment_intent: order.stripePaymentIntentId,
        amount: order.amountCents,
        metadata: {
          purpose: "label_direct_payment_refund",
          pending_label_order_id: order.id,
          user_id: order.userId,
        },
      },
      { idempotencyKey: `label-refund-${order.id}` },
    );

    const refundedOrder = await markPendingLabelOrderRefunded(order.id, {
      stripeRefundId: refund.id,
      reason: `[refunded by ${opts.adminEmail ?? opts.adminUserId}] ${opts.reason}`,
    });

    await createAuditLog({
      actorUserId: opts.adminUserId,
      actorEmail: opts.adminEmail ?? null,
      userId: order.userId,
      eventType: "label_refund_succeeded",
      severity: "info",
      entityType: "balance_movement",
      entityId: order.id,
      provider: order.provider,
      message: "Stripe refund succeeded for direct label payment.",
      metadata: {
        orderId: order.id,
        stripeRefundId: refund.id,
        amountCents: order.amountCents,
        refundStatus: refund.status ?? null,
      },
    });

    return refundedOrder;
  } catch (error) {
    const message = safeErrorMessage(error);
    const failedOrder = await markPendingLabelOrderRefundFailed(order.id, message);
    await createAuditLog({
      actorUserId: opts.adminUserId,
      actorEmail: opts.adminEmail ?? null,
      userId: order.userId,
      eventType: "label_refund_failed",
      severity: "error",
      entityType: "balance_movement",
      entityId: order.id,
      provider: order.provider,
      message: "Stripe refund failed for direct label payment.",
      metadata: {
        orderId: order.id,
        reason: message,
      },
    });
    return failedOrder;
  }
}

export async function markOrderRefundedManual(
  orderId: string,
  opts: {
    adminUserId: string;
    adminEmail?: string | null;
    reason: string;
  },
): Promise<PendingLabelOrder> {
  const order = await getPendingLabelOrderByIdForAdmin(orderId);
  if (!order) throw new Error("Order not found.");
  if (order.status === "label_purchased") {
    throw new Error("Purchased labels cannot be marked refunded manually from this flow.");
  }
  if (!MANUAL_REFUNDED_STATUSES.includes(order.status as (typeof MANUAL_REFUNDED_STATUSES)[number])) {
    throw new Error(`Order status '${order.status}' cannot be marked manually refunded.`);
  }
  if (!order.stripePaymentIntentId) {
    throw new Error("This order has no Stripe payment intent.");
  }
  if (!order.paidAt) {
    throw new Error("This order has no paid_at timestamp.");
  }
  if (order.labelId || order.trackingNumber) {
    throw new Error("This order already has label data and cannot be marked refunded directly.");
  }
  if (order.status === "refunded") return order;

  const updated = await markPendingLabelOrderRefunded(order.id, {
    stripeRefundId: order.stripeRefundId ?? null,
    reason: `[manual Stripe refund recorded by ${opts.adminEmail ?? opts.adminUserId}] ${opts.reason}`,
  });

  await createAuditLog({
    actorUserId: opts.adminUserId,
    actorEmail: opts.adminEmail ?? null,
    userId: order.userId,
    eventType: "label_refund_marked_manual",
    severity: "warning",
    entityType: "balance_movement",
    entityId: order.id,
    provider: order.provider,
    message: "Admin marked direct label payment as refunded after manual Stripe Dashboard action.",
    metadata: {
      orderId: order.id,
      previousStatus: order.status,
    },
  });

  return updated;
}
