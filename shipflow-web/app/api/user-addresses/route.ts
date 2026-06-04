import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import {
  createUserAddress,
  getUserAddressErrorDetails,
  listUserAddresses,
  logUserAddressServerError,
  normalizeUserAddressInput,
} from "@/lib/server/userAddresses";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

export async function GET(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    const { supabase, user } = await requireVerifiedUser(request);
    const addresses = await listUserAddresses(supabase, user.id);
    return apiSuccess({ addresses });
  } catch (error) {
    logUserAddressServerError("list", error);
    if (error instanceof Response) {
      return apiError("No pudimos cargar las direcciones.", error.status, getUserAddressErrorDetails(error));
    }
    return apiError("No pudimos cargar las direcciones.", 500, getUserAddressErrorDetails(error));
  }
}

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    const { supabase, user } = await requireVerifiedUser(request);
    const input = normalizeUserAddressInput(await request.json());
    const address = await createUserAddress(supabase, user.id, input);
    return apiSuccess({ address }, 201);
  } catch (error) {
    logUserAddressServerError("create", error);
    if (error instanceof Response) {
      return apiError("No pudimos crear la dirección.", error.status, getUserAddressErrorDetails(error));
    }
    return apiError("No pudimos crear la dirección.", 500, getUserAddressErrorDetails(error));
  }
}
