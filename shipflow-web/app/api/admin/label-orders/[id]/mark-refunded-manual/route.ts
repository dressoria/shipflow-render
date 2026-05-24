import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";
import { markOrderRefundedManual } from "@/lib/server/labelPaymentRefunds";

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

    const body = (await request.json()) as { reason?: string };
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) return apiError("A manual refund note is required.", 400);

    const order = await markOrderRefundedManual(id, {
      adminUserId: user.id,
      adminEmail: user.email ?? null,
      reason,
    });

    return apiSuccess({ order });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not mark this order as manually refunded.");
  }
}
