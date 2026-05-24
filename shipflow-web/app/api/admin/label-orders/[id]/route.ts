import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { getPendingLabelOrderByIdForAdmin } from "@/lib/server/pendingLabelOrders";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin support is not configured correctly.", 503);
  }

  try {
    await requireAdminUser(request);
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return apiError("Missing order id.", 400);
    }

    const order = await getPendingLabelOrderByIdForAdmin(id);
    if (!order) return apiError("Order not found.", 404);

    return apiSuccess({ order });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load this label order.");
  }
}
