import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { adminMarkExpired } from "@/lib/server/pendingLabelOrders";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";

export async function POST(
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

    const order = await adminMarkExpired(id);

    return apiSuccess({ order });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not mark this order as expired.");
  }
}
