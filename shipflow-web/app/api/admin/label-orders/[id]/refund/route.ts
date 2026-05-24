import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";
import { canRefundLabelPayment } from "@/lib/server/featureGates";
import { createAuditLog } from "@/lib/server/auditLog";
import { getPendingLabelOrderByIdForAdmin } from "@/lib/server/pendingLabelOrders";
import { createStripeRefundForPendingLabelOrder } from "@/lib/server/labelPaymentRefunds";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin support is not configured correctly.", 503);
  }

  try {
    const { user } = await requireAdminUser(request);
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return apiError("Missing order id.", 400);
    }

    const gate = canRefundLabelPayment({ id: user.id, email: user.email ?? null });
    if (!gate.allowed) {
      const order = await getPendingLabelOrderByIdForAdmin(id);
      await createAuditLog({
        actorUserId: user.id,
        actorEmail: user.email ?? null,
        userId: order?.userId ?? null,
        eventType: "label_refund_gate_denied",
        severity: "warning",
        entityType: "balance_movement",
        entityId: id,
        message: "Admin Stripe refund blocked by feature gate.",
        metadata: {
          orderId: id,
          reason: gate.reason,
          feature: "label_payment_refunds",
        },
      });
      return apiError(
        gate.reason === "feature_disabled"
          ? "Label payment refunds are not enabled."
          : "Refunds are not available for this admin account.",
        gate.httpStatus,
      );
    }

    const body = (await request.json()) as { reason?: string; confirmation?: string };
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const confirmation = typeof body.confirmation === "string" ? body.confirmation.trim() : "";
    if (!reason) return apiError("A reason is required.", 400);
    if (confirmation !== "REFUND") return apiError("Type REFUND to confirm this Stripe refund.", 400);

    const order = await createStripeRefundForPendingLabelOrder(id, {
      adminUserId: user.id,
      adminEmail: user.email ?? null,
      reason,
    });

    return apiSuccess({ order });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not refund this label payment.");
  }
}
