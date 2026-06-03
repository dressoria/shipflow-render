import { ECUADOR_ADMIN_EDITABLE_STATUSES, type EcuadorShipmentStatus } from "@/lib/ecuador/types";
import { getEcuadorStatusEventTitle } from "@/lib/ecuador/copy";
import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import {
  addRegionalShipmentEvent,
  getAdminEcuadorShipmentRequest,
  isKnownEcuadorRequestErrorMessage,
  updateAdminEcuadorShipmentRequest,
} from "@/lib/server/regionalShipments";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";

function parseOptionalNumber(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function toAdminEcuadorApiError(error: unknown, fallbackMessage: string) {
  if (error instanceof Response) {
    return apiError((await error.text()) || fallbackMessage, error.status);
  }

  if (error instanceof Error && isKnownEcuadorRequestErrorMessage(error.message)) {
    return apiError(error.message, 400);
  }

  return apiError(fallbackMessage, 500);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin Ecuador Shipping is not configured correctly.", 503);
  }

  try {
    const { serviceSupabase } = await requireAdminUser(request);
    const { id } = await params;
    const shipment = await getAdminEcuadorShipmentRequest(serviceSupabase, id);
    if (!shipment) return apiError("Ecuador Shipping request not found.", 404);
    return apiSuccess({ shipment });
  } catch (error) {
    return toAdminEcuadorApiError(error, "We could not load this admin Ecuador Shipping request.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin Ecuador Shipping is not configured correctly.", 503);
  }

  try {
    const { serviceSupabase, user } = await requireAdminUser(request);
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const existing = await getAdminEcuadorShipmentRequest(serviceSupabase, id);
    if (!existing) return apiError("Ecuador Shipping request not found.", 404);

    const nextStatus: EcuadorShipmentStatus | undefined =
      typeof body.status === "string" && ECUADOR_ADMIN_EDITABLE_STATUSES.includes(body.status as never)
      ? body.status as EcuadorShipmentStatus
      : undefined;
    const nextProvider = body.provider === "manual" || body.provider === "mock" || body.provider === "delivereo"
      ? body.provider
      : undefined;
    if (body.status != null && !nextStatus) return apiError("Invalid Ecuador admin status filter.", 400);
    if (body.provider != null && !nextProvider) return apiError("Invalid Ecuador admin provider.", 400);

    const shipment = await updateAdminEcuadorShipmentRequest(serviceSupabase, id, {
      status: nextStatus,
      provider: nextProvider,
      providerStatus: typeof body.providerStatus === "string" ? body.providerStatus : undefined,
      providerOrderId: typeof body.providerOrderId === "string" ? body.providerOrderId : undefined,
      providerTrackingId: typeof body.providerTrackingId === "string" ? body.providerTrackingId : undefined,
      customerPrice: body.customerPrice !== undefined ? parseOptionalNumber(body.customerPrice) : undefined,
      providerCost: body.providerCost !== undefined ? parseOptionalNumber(body.providerCost) : undefined,
      margin: body.margin !== undefined ? parseOptionalNumber(body.margin) : undefined,
      adminNotes: typeof body.adminNotes === "string" ? body.adminNotes : undefined,
    });
    if (!shipment) return apiError("Ecuador Shipping request not found.", 404);

    const statusChanged = nextStatus && nextStatus !== existing.status;
    const statusEventVisibility = body.statusEventVisibility === "internal"
      ? "internal"
      : body.statusEventVisibility === "none"
        ? "none"
        : "customer";

    if (statusChanged && statusEventVisibility !== "none") {
      await addRegionalShipmentEvent(serviceSupabase, id, {
        visibility: statusEventVisibility,
        status: nextStatus,
        title: typeof body.statusEventTitle === "string" && body.statusEventTitle.trim()
          ? body.statusEventTitle.trim()
          : getEcuadorStatusEventTitle(nextStatus),
        message: typeof body.statusEventMessage === "string" ? body.statusEventMessage : null,
        createdBy: user.id,
      });
    }

    const newEvent = (body.newEvent ?? null) as Record<string, unknown> | null;
    if (newEvent && typeof newEvent.title === "string" && newEvent.title.trim()) {
      await addRegionalShipmentEvent(serviceSupabase, id, {
        visibility: newEvent.visibility === "internal" ? "internal" : "customer",
        status: typeof newEvent.status === "string" ? newEvent.status as EcuadorShipmentStatus : null,
        title: newEvent.title.trim(),
        message: typeof newEvent.message === "string" ? newEvent.message : null,
        createdBy: user.id,
      });
    }

    const refreshed = await getAdminEcuadorShipmentRequest(serviceSupabase, id);
    return apiSuccess({ shipment: refreshed });
  } catch (error) {
    return toAdminEcuadorApiError(error, "We could not update this Ecuador Shipping request.");
  }
}
