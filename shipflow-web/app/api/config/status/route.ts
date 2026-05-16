import { apiSuccess } from "@/lib/server/apiResponse";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";
import { PROVIDER_CAPABILITIES } from "@/lib/logistics/providerCapabilities";

// Public endpoint — returns only booleans. Never reveals secrets or key values.
// Used by the UI to determine whether real quoting and label creation are available.
export async function GET() {
  const aggregationProviders = (["shipstation", "shippo", "easypost", "easyship"] as const).filter(
    (p) => PROVIDER_CAPABILITIES[p].configured && PROVIDER_CAPABILITIES[p].supportsRates,
  );

  const googleMapsConfigured = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()?.length,
  );

  return apiSuccess({
    supabaseConfigured: isServerSupabaseConfigured,
    serviceRoleConfigured: isServiceRoleConfigured,
    ratesConfigured: aggregationProviders.length > 0,
    googleMapsConfigured,
    activeRateProviders: aggregationProviders.length,
  });
}
