import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { getDelivereoAuthSnapshot, testDelivereoAuthentication } from "@/lib/server/delivereoAuth";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin Ecuador providers are not configured correctly.", 503);
  }

  try {
    await requireAdminUser(request);
    const snapshot = await testDelivereoAuthentication();
    return apiSuccess({ snapshot, ok: true, message: "Delivereo authentication validated." });
  } catch (error) {
    if (error instanceof Response) {
      const snapshot = getDelivereoAuthSnapshot();
      return apiSuccess({
        snapshot,
        ok: false,
        message: (await error.text()) || "Delivereo authentication failed.",
      });
    }
    return apiErrorFromUnknown(error, "Delivereo authentication failed.");
  }
}
