import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { getEcuadorProviderDiagnosticsSnapshots, testDelivereoAuthentication } from "@/lib/server/delivereoAuth";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin Ecuador providers are not configured correctly.", 503);
  }

  try {
    await requireAdminUser(request);
    await testDelivereoAuthentication();
    return apiSuccess({ snapshots: getEcuadorProviderDiagnosticsSnapshots(), ok: true, message: "Delivereo authentication validated." });
  } catch (error) {
    const snapshots = getEcuadorProviderDiagnosticsSnapshots();
    const message =
      error instanceof Response
        ? (await error.text()) || "Delivereo authentication failed."
        : error instanceof Error
          ? error.message || "Delivereo authentication failed."
          : "Delivereo authentication failed.";

    return apiSuccess({
      snapshots,
      ok: false,
      message,
    });
  }
}
