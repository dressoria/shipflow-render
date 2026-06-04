import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import {
  deleteUserAddress,
  normalizeUserAddressInput,
  setUserAddressDefault,
  updateUserAddress,
} from "@/lib/server/userAddresses";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

function normalizeAddressId(value: string) {
  return value.trim();
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    const { id } = await context.params;
    const addressId = normalizeAddressId(id);
    if (!addressId) return apiError("Address id is required.", 400);

    const { supabase, user } = await requireVerifiedUser(request);
    const body = (await request.json()) as Record<string, unknown>;

    if (body.makeDefault === true) {
      const mode = body.defaultMode === "sender" || body.defaultMode === "recipient" ? body.defaultMode : "both";
      const address = await setUserAddressDefault(supabase, user.id, addressId, mode);
      return apiSuccess({ address });
    }

    const input = normalizeUserAddressInput(body);
    const address = await updateUserAddress(supabase, user.id, addressId, input);
    return apiSuccess({ address });
  } catch (error) {
    if (error instanceof Response) {
      return apiError((await error.text()) || "We could not update the address.", error.status);
    }
    return apiError(error instanceof Error ? error.message : "We could not update the address.", 500);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    const { id } = await context.params;
    const addressId = normalizeAddressId(id);
    if (!addressId) return apiError("Address id is required.", 400);

    const { supabase, user } = await requireVerifiedUser(request);
    await deleteUserAddress(supabase, user.id, addressId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof Response) {
      return apiError((await error.text()) || "We could not delete the address.", error.status);
    }
    return apiError(error instanceof Error ? error.message : "We could not delete the address.", 500);
  }
}
