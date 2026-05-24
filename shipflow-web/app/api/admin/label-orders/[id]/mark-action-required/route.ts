import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { adminMarkActionRequired } from "@/lib/server/pendingLabelOrders";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";

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
    if (!reason) return apiError("A reason is required.", 400);

    const safeReason = `[admin:${user.email ?? "unknown"}] ${reason}`;
    const order = await adminMarkActionRequired(id, safeReason);

    return apiSuccess({ order });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not mark this order as action_required.");
  }
}
