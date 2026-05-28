// FASE 5.44 — User-facing endpoint to check the status of a pending label order.
//
// GET /api/billing/label-orders/[id]
//
// Returns the current status and safe fields of a pending label order
// that belongs to the authenticated user. Used by the success/cancel page
// to show live order state after returning from Stripe Checkout.
//
// Only returns the user's own orders — service_role check + user_id filter.
// Does not expose Stripe secret keys, provider credentials, or allowlist data.

import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import {
  isServerSupabaseConfigured,
  isServiceRoleConfigured,
  requireVerifiedUser,
  createServiceSupabaseClient,
} from "@/lib/server/supabaseServer";
import { getPendingLabelOrderForUser } from "@/lib/server/pendingLabelOrders";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  let userId: string;
  try {
    const { user } = await requireVerifiedUser(request);
    userId = user.id;
  } catch (error) {
    if (error instanceof Response) {
      return apiError((await error.text()) || "Unauthorized.", error.status);
    }
    return apiError("Authentication failed.", 401);
  }

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return apiError("Missing order id.", 400);
  }

  try {
    const order = await getPendingLabelOrderForUser(id, userId);
    if (!order) {
      return apiError("Order not found.", 404);
    }

    let labelUrl: string | null = null;
    if (order.shipmentId) {
      const serviceSupabase = createServiceSupabaseClient();
      const { data: shipment } = await serviceSupabase
        .from("shipments")
        .select("label_url")
        .eq("id", order.shipmentId)
        .eq("user_id", userId)
        .maybeSingle<{ label_url: string | null }>();
      labelUrl = shipment?.label_url ?? null;
    }

    return apiSuccess({
      id: order.id,
      status: order.status,
      provider: order.provider,
      serviceCode: order.serviceCode ?? null,
      serviceName: order.serviceName ?? null,
      amountCents: order.amountCents,
      currency: order.currency,
      trackingNumber: order.trackingNumber ?? null,
      labelUrl,
      labelId: order.labelId ?? null,
      shipmentId: order.shipmentId ?? null,
      errorMessage: order.errorMessage ?? null,
      paidAt: order.paidAt ?? null,
      processedAt: order.processedAt ?? null,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? "");
    const isMissingTable =
      msg.includes("42P01") ||
      msg.includes("PGRST205") ||
      msg.toLowerCase().includes("pending_label_orders");
    if (isMissingTable) {
      return apiError("Label order data is not available yet.", 503);
    }
    return apiError("Could not load label order.", 500);
  }
}
