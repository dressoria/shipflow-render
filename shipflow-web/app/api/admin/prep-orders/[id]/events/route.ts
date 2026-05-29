import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { PREP_STATUSES } from "@/lib/prep";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";
import { loadPrepOrderDetails, type PrepOrderRow } from "@/lib/server/prepOrders";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin Prep is not configured correctly.", 503);
  }

  try {
    const { serviceSupabase, user } = await requireAdminUser(request);
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const visibility = body.visibility === "internal" ? "internal" : "customer";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const status = typeof body.status === "string" && PREP_STATUSES.includes(body.status as never) ? body.status : null;

    if (!title) return apiError("Event title is required.", 400);

    const { error: eventError } = await serviceSupabase.from("prep_order_events").insert({
      prep_order_id: id,
      visibility,
      status,
      title,
      message: message || null,
      created_by: user.id,
    });
    if (eventError) throw eventError;

    const { data: order, error } = await serviceSupabase
      .from("prep_orders")
      .select("*")
      .eq("id", id)
      .maybeSingle<PrepOrderRow>();
    if (error) throw error;
    if (!order) return apiError("Prep order not found.", 404);

    return apiSuccess({ order: await loadPrepOrderDetails(serviceSupabase, order, true) }, 201);
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not add this Prep event.");
  }
}
