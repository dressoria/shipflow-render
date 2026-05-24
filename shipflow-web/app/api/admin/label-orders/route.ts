import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { listPendingLabelOrdersForAdmin } from "@/lib/server/pendingLabelOrders";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";
import { parseAdminLimit } from "@/lib/server/adminSupport";

function isPendingLabelOrdersTableMissing(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "42P01" ||
    candidate.code === "PGRST205" ||
    (candidate.message?.toLowerCase().includes("pending_label_orders") ?? false)
  );
}

export async function GET(request: Request) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin support is not configured correctly.", 503);
  }

  try {
    await requireAdminUser(request);

    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const provider = url.searchParams.get("provider") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    const limit = parseAdminLimit(url.searchParams.get("limit"), 50);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? "0"), 0);

    const result = await listPendingLabelOrdersForAdmin({ status, provider, search, limit, offset });

    return apiSuccess({ orders: result.orders, total: result.total, limit, offset });
  } catch (error) {
    if (isPendingLabelOrdersTableMissing(error)) {
      return apiSuccess({
        orders: [],
        total: 0,
        limit: 50,
        offset: 0,
        warning: "Pending label orders table is not available yet. Apply the migration first.",
      });
    }
    return apiErrorFromUnknown(error, "We could not load label orders.");
  }
}
