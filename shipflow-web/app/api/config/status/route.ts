import { apiSuccess } from "@/lib/server/apiResponse";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";
import { PROVIDER_CAPABILITIES } from "@/lib/logistics/providerCapabilities";
import { isStripeConfigured, isStripeWebhookConfigured } from "@/lib/server/stripe";

// Public endpoint — returns only booleans/safe metadata. Never reveals secrets or key values.
// Used by the UI to determine whether real quoting and label creation are available.
// Also used as a build-env diagnostic to verify NEXT_PUBLIC_* vars were baked correctly.
export async function GET() {
  const aggregationProviders = (["shipstation", "shippo", "easypost", "easyship"] as const).filter(
    (p) => PROVIDER_CAPABILITIES[p].configured && PROVIDER_CAPABILITIES[p].supportsRates,
  );

  const googleMapsConfigured = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()?.length,
  );

  const stripeRechargeEnabled = isStripeConfigured && isStripeWebhookConfigured && isServiceRoleConfigured;

  // Build-env diagnostics — safe hostname only, never full URLs with tokens.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const appUrlConfigured = Boolean(appUrl);
  let appUrlHost: string | null = null;
  if (appUrl) {
    try {
      appUrlHost = new URL(appUrl).hostname;
    } catch {
      appUrlHost = null;
    }
  }

  // buildEnvOk is true only if the three critical NEXT_PUBLIC_* vars exist on this
  // server process. In Docker, these are baked at build time for the client bundle
  // but also readable server-side. If any is missing here, the build had wrong vars.
  const buildEnvOk = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
    appUrl,
  );

  return apiSuccess({
    supabaseConfigured: isServerSupabaseConfigured,
    serviceRoleConfigured: isServiceRoleConfigured,
    ratesConfigured: aggregationProviders.length > 0,
    googleMapsConfigured,
    stripeRechargeConfigured: stripeRechargeEnabled,
    stripeRechargeEnabled,
    activeRateProviders: aggregationProviders.length,
    labelPurchaseEnabled: process.env.ENABLE_REAL_LABEL_PURCHASE === "true",
    realLabelPurchaseEnabled: process.env.ENABLE_REAL_LABEL_PURCHASE === "true",
    labelVoidEnabled: process.env.ENABLE_REAL_LABEL_VOID === "true",
    directLabelPaymentEnabled: process.env.ENABLE_DIRECT_LABEL_PAYMENT === "true",
    processLabelInWebhookEnabled: process.env.ENABLE_PROCESS_LABEL_IN_WEBHOOK === "true",
    labelPaymentRefundsEnabled: process.env.ENABLE_LABEL_PAYMENT_REFUNDS === "true",
    appUrlConfigured,
    appUrlHost,
    buildEnvOk,
  });
}
