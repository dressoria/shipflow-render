import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { loadPrepOrderDetails, type PrepOrderRow } from "@/lib/server/prepOrders";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    const { supabase, user } = await requireVerifiedUser(request);
    const { id } = await params;
    const { data: order, error } = await supabase
      .from("prep_orders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle<PrepOrderRow>();

    if (error) throw error;
    if (!order) return apiError("Prep order not found.", 404);

    return apiSuccess({ order: await loadPrepOrderDetails(supabase, order, false) });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load this Prep order.");
  }
}
