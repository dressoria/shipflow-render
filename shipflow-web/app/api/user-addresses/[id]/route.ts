import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import {
  deleteUserAddress,
  getUserAddressErrorDetails,
  logUserAddressServerError,
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
    if (!addressId) return apiError("No pudimos actualizar la dirección.", 400, "Falta el identificador de la dirección.");

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
    logUserAddressServerError("update", error);
    if (error instanceof Response) {
      return apiError("No pudimos actualizar la dirección.", error.status, getUserAddressErrorDetails(error));
    }
    return apiError("No pudimos actualizar la dirección.", 500, getUserAddressErrorDetails(error));
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
    if (!addressId) return apiError("No pudimos eliminar la dirección.", 400, "Falta el identificador de la dirección.");

    const { supabase, user } = await requireVerifiedUser(request);
    await deleteUserAddress(supabase, user.id, addressId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    logUserAddressServerError("delete", error);
    if (error instanceof Response) {
      return apiError("No pudimos eliminar la dirección.", error.status, getUserAddressErrorDetails(error));
    }
    return apiError("No pudimos eliminar la dirección.", 500, getUserAddressErrorDetails(error));
  }
}
