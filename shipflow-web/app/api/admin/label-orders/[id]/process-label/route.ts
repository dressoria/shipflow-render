// FASE 5.40B — Admin endpoint to trigger server-side label purchase for a pending order.
//
// POST /api/admin/label-orders/[id]/process-label
//
// Requirements:
//   - Admin auth (profile.role = 'admin' or email in ADMIN_EMAILS).
//   - ENABLE_REAL_LABEL_PURCHASE=true (hard safety guard, checked in processor).
//   - Order must be in paid_waiting_label_purchase or label_purchase_pending.
//   - Query param ?allow_test_mode=1 allows processing a paid_test_mode order (admin QA only).
//
// The processor (purchaseLabelForPendingOrder) handles all state transitions and audit logging.

import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";
import { isStripeConfigured } from "@/lib/server/stripe";
import { purchaseLabelForPendingOrder } from "@/lib/server/labelPurchaseProcessor";
import { getPendingLabelOrderByIdForAdmin } from "@/lib/server/pendingLabelOrders";
import { createAuditLog } from "@/lib/server/auditLog";
import { canPurchaseRealLabelForUserId } from "@/lib/server/featureGates";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin support is not configured correctly.", 503);
  }

  if (!isStripeConfigured) {
    return apiError("Stripe is not configured.", 503);
  }

  if (process.env.ENABLE_REAL_LABEL_PURCHASE !== "true") {
    return apiError(
      "Real label purchase is not enabled. Set ENABLE_REAL_LABEL_PURCHASE=true to use this endpoint.",
      503,
    );
  }

  try {
    const { user } = await requireAdminUser(request);
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return apiError("Missing order id.", 400);
    }

    const order = await getPendingLabelOrderByIdForAdmin(id);
    if (!order) {
      return apiError("Order not found.", 404);
    }

    const ownerGate = await canPurchaseRealLabelForUserId(order.userId);
    if (!ownerGate.allowed) {
      await createAuditLog({
        actorUserId: user.id,
        actorEmail: user.email ?? null,
        userId: order.userId,
        eventType: "label_feature_gate_denied",
        severity: "warning",
        entityType: "shipment",
        entityId: order.id,
        provider: order.provider,
        message: "Admin label processing blocked because order owner is not allowlisted.",
        metadata: {
          orderId: order.id,
          feature: "real_label_purchase",
          reason: ownerGate.reason,
        },
      });
      return apiError(
        "Real label purchase is not available for this order owner yet.",
        ownerGate.httpStatus,
      );
    }

    // ?allow_test_mode=1 allows processing paid_test_mode orders (for admin QA with real label).
    const url = new URL(request.url);
    const allowTestMode = url.searchParams.get("allow_test_mode") === "1";

    const result = await purchaseLabelForPendingOrder(id, { allowTestMode });

    return apiSuccess({
      ...result,
      triggeredBy: user.email ?? "admin",
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "Label purchase failed.");
  }
}
