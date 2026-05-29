import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";
import { fromPrepOrderRow, type PrepOrderRow } from "@/lib/server/prepOrders";

function parseLimit(value: string | null) {
  const limit = Number(value ?? 50);
  if (!Number.isFinite(limit)) return 50;
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

export async function GET(request: Request) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin Prep is not configured correctly.", 503);
  }

  try {
    const { serviceSupabase } = await requireAdminUser(request);
    const url = new URL(request.url);
    const status = url.searchParams.get("status")?.trim();
    const search = url.searchParams.get("search")?.trim();
    const limit = parseLimit(url.searchParams.get("limit"));

    let query = serviceSupabase
      .from("prep_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,contact_email.ilike.%${search}%,product_summary.ilike.%${search}%`);
    }

    const { data, error } = await query.returns<PrepOrderRow[]>();
    if (error) throw error;

    return apiSuccess({
      orders: (data ?? []).map((row) => fromPrepOrderRow(row, { includeInternal: true })),
      limit,
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load admin Prep orders.");
  }
}
