import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import {
  createUserAddress,
  listUserAddresses,
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
    if (error instanceof Response) {
      return apiError((await error.text()) || "We could not load addresses.", error.status);
    }
    return apiError(error instanceof Error ? error.message : "We could not load addresses.", 500);
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
    if (error instanceof Response) {
      return apiError((await error.text()) || "We could not create the address.", error.status);
    }
    return apiError(error instanceof Error ? error.message : "We could not create the address.", 500);
  }
}
