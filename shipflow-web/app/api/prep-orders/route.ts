import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import {
  createPrepOrder,
  fromPrepOrderRow,
  normalizeCreatePrepOrderInput,
  type PrepOrderRow,
} from "@/lib/server/prepOrders";
import { requirePrepBetaAccess } from "@/lib/server/prepAccess";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

function parseLimit(value: string | null) {
  const limit = Number(value ?? 50);
  if (!Number.isFinite(limit)) return 50;
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

export async function GET(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    const { supabase, user } = await requireVerifiedUser(request);
    await requirePrepBetaAccess(supabase, user);
    const url = new URL(request.url);
    const status = url.searchParams.get("status")?.trim();
    const limit = parseLimit(url.searchParams.get("limit"));

    let query = supabase
      .from("prep_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);

    const { data, error } = await query.returns<PrepOrderRow[]>();
    if (error) throw error;

    return apiSuccess({ orders: (data ?? []).map((row) => fromPrepOrderRow(row)), limit });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load Prep orders.");
  }
}

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    const { supabase, user } = await requireVerifiedUser(request);
    await requirePrepBetaAccess(supabase, user);
    const input = normalizeCreatePrepOrderInput(await request.json());
    const order = await createPrepOrder(supabase, user.id, input);
    return apiSuccess({ order }, 201);
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not create this Prep request.");
  }
}
