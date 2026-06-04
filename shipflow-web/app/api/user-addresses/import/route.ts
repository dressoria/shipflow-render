import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import {
  createUserAddress,
  getUserAddressErrorDetails,
  listUserAddresses,
  logUserAddressServerError,
  normalizeUserAddressInput,
} from "@/lib/server/userAddresses";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

function dedupeKey(address: {
  label: string;
  addressLine1: string;
  city: string;
  country: string;
}) {
  return [address.label.trim().toLowerCase(), address.addressLine1.trim().toLowerCase(), address.city.trim().toLowerCase(), address.country.trim().toUpperCase()].join("|");
}

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    const { supabase, user } = await requireVerifiedUser(request);
    const body = (await request.json()) as { addresses?: unknown[] };
    const addresses = Array.isArray(body.addresses) ? body.addresses : [];
    const existing = await listUserAddresses(supabase, user.id);
    const existingKeys = new Set(
      existing.map((row) =>
        dedupeKey({
          label: row.label,
          addressLine1: row.address_line1,
          city: row.city,
          country: row.country,
        }),
      ),
    );

    let imported = 0;

    for (const raw of addresses) {
      const input = normalizeUserAddressInput(raw);
      const key = dedupeKey(input);
      if (existingKeys.has(key)) continue;
      await createUserAddress(supabase, user.id, input);
      existingKeys.add(key);
      imported += 1;
    }

    const refreshed = await listUserAddresses(supabase, user.id);
    return apiSuccess({ imported, addresses: refreshed });
  } catch (error) {
    logUserAddressServerError("import", error);
    if (error instanceof Response) {
      return apiError("No pudimos importar las direcciones guardadas.", error.status, getUserAddressErrorDetails(error));
    }
    return apiError("No pudimos importar las direcciones guardadas.", 500, getUserAddressErrorDetails(error));
  }
}
