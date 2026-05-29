import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PREP_STATUSES } from "@/lib/prep";
import { requireAdminUser } from "@/lib/server/adminAuth";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";
import { dollarsToCents, loadPrepOrderDetails, type PrepOrderRow } from "@/lib/server/prepOrders";

async function loadOrder(serviceSupabase: SupabaseClient, id: string) {
  const { data: order, error } = await serviceSupabase
    .from("prep_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle<PrepOrderRow>();
  if (error) throw error;
  return order;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin Prep is not configured correctly.", 503);
  }

  try {
    const { serviceSupabase } = await requireAdminUser(request);
    const { id } = await params;
    const order = await loadOrder(serviceSupabase, id);
    if (!order) return apiError("Prep order not found.", 404);
    return apiSuccess({ order: await loadPrepOrderDetails(serviceSupabase, order, true) });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load this admin Prep order.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin Prep is not configured correctly.", 503);
  }

  try {
    const { serviceSupabase } = await requireAdminUser(request);
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if (typeof body.status === "string" && PREP_STATUSES.includes(body.status as never)) patch.status = body.status;
    if (typeof body.adminNotes === "string") patch.admin_notes = body.adminNotes.trim() || null;
    if (typeof body.partnerNameInternal === "string") patch.partner_name_internal = body.partnerNameInternal.trim() || null;
    if (typeof body.partnerReferenceInternal === "string") patch.partner_reference_internal = body.partnerReferenceInternal.trim() || null;
    if (typeof body.receivingReference === "string") patch.receiving_reference = body.receivingReference.trim() || null;

    if (body.estimatedUnitPrice != null) patch.estimated_unit_price = dollarsToCents(body.estimatedUnitPrice);
    if (body.estimatedTotal != null) patch.estimated_total = dollarsToCents(body.estimatedTotal);
    if (body.finalUnitPrice != null) patch.final_unit_price = dollarsToCents(body.finalUnitPrice);
    if (body.finalTotal != null) patch.final_total = dollarsToCents(body.finalTotal);
    if (body.partnerCostTotal != null) patch.partner_cost_total = dollarsToCents(body.partnerCostTotal);
    if (body.marginTotal != null) patch.margin_total = dollarsToCents(body.marginTotal);

    if (Object.keys(patch).length === 0) return apiError("No valid Prep fields were provided.", 400);

    const { data: order, error } = await serviceSupabase
      .from("prep_orders")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle<PrepOrderRow>();
    if (error) throw error;
    if (!order) return apiError("Prep order not found.", 404);

    return apiSuccess({ order: await loadPrepOrderDetails(serviceSupabase, order, true) });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not update this Prep order.");
  }
}
