import { getLogisticsAdapter } from "@/lib/logistics/registry";
import { getProviderCapabilities } from "@/lib/logistics/providerCapabilities";
import { calculateCustomerPrice } from "@/lib/logistics/pricing";
import { deduplicateRates } from "@/lib/logistics/rateDeduplication";
import { rankRates } from "@/lib/logistics/rateRanking";
import type { LogisticsProvider, RateInput, RateResult } from "@/lib/logistics/types";

// Providers eligible for aggregation — internal/mock are excluded (fallback only).
const AGGREGATION_PROVIDERS: LogisticsProvider[] = ["shipstation", "shippo", "easypost", "easyship"];

type ProviderOutcome =
  | { provider: LogisticsProvider; rates: RateResult[]; ok: true }
  | { provider: LogisticsProvider; error: string; ok: false };

export type AggregatedRatesResult = {
  rates: RateResult[];   // priced, deduplicated, ranked; tags populated
  outcomes: ProviderOutcome[];
  queriedProviders: LogisticsProvider[];
  configuredCount: number;
};

// Applies the ShipFlow pricing model to a raw provider rate.
// Adapters return rates with pricing.providerCost = raw cost and markup = 0.
// The aggregator is responsible for applying the real markup + payment fee on top.
function repriceRate(rate: RateResult): RateResult {
  const providerCost = rate.pricing.providerCost;
  const pricing = calculateCustomerPrice(providerCost);
  return {
    ...rate,
    platformMarkup: pricing.platformMarkup,
    customerPrice: pricing.customerPrice,
    pricing,
  };
}

export async function aggregateRates(input: RateInput): Promise<AggregatedRatesResult> {
  const eligible = AGGREGATION_PROVIDERS.filter((p) => {
    const caps = getProviderCapabilities(p);
    return caps.configured && caps.supportsRates;
  });

  const settled = await Promise.allSettled(
    eligible.map(async (provider) => {
      const adapter = getLogisticsAdapter(provider);
      const rates = await adapter.getRates(input);
      return { provider, rates };
    }),
  );

  const outcomes: ProviderOutcome[] = settled.map((result, i) => {
    const provider = eligible[i];
    if (result.status === "fulfilled") {
      return { provider, rates: result.value.rates, ok: true as const };
    }
    const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
    console.error(`[RateAggregator] ${provider} failed: ${msg}`);
    return { provider, error: msg, ok: false as const };
  });

  // Collect raw rates from all successful providers.
  const rawRates = outcomes
    .filter((o): o is Extract<ProviderOutcome, { ok: true }> => o.ok)
    .flatMap((o) => o.rates);

  // Pipeline: reprice → deduplicate → rank
  const priced = rawRates.map(repriceRate);
  const deduped = deduplicateRates(priced);
  const ranked = rankRates(deduped);

  return {
    rates: ranked,
    outcomes,
    queriedProviders: eligible,
    configuredCount: eligible.length,
  };
}
