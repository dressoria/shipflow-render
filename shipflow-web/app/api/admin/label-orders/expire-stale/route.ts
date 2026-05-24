import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { expireStalePendingLabelOrders } from "@/lib/server/pendingLabelOrders";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";

// Manually trigger the expiry sweep for pending_payment orders past their expires_at.
// In a future phase this will be called by a cron/worker instead.
export async function POST(request: Request) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin support is not configured correctly.", 503);
  }

  try {
    await requireAdminUser(request);
    const result = await expireStalePendingLabelOrders();
    return apiSuccess({ expiredCount: result.expiredCount });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not run the expiry sweep.");
  }
}
