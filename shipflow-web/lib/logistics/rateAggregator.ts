import { getLogisticsAdapter } from "@/lib/logistics/registry";
import { getProviderCapabilities } from "@/lib/logistics/providerCapabilities";
import { calculateCustomerPrice } from "@/lib/logistics/pricing";
import { deduplicateRates } from "@/lib/logistics/rateDeduplication";
import { rankRates } from "@/lib/logistics/rateRanking";
import type { LogisticsProvider, RateInput, RateResult } from "@/lib/logistics/types";

// Providers eligible for aggregation — internal/mock are excluded (fallback only).
const AGGREGATION_PROVIDERS: LogisticsProvider[] = ["shipstation", "shippo", "easypost", "easyship"];
const PROVIDER_RATE_TIMEOUT_MS = 15000;

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

function isCustomerVisibleRate(rate: RateResult): boolean {
  if (rate.provider === "internal" || rate.provider === "mock") return false;

  const haystack = [
    rate.provider,
    rate.courierId,
    rate.courierName,
    rate.serviceCode,
    rate.serviceName,
  ]
    .join(" ")
    .toLowerCase();

  return !/\b(dummy|mock|internal|demo|test carrier)\b/.test(haystack);
}

function withProviderTimeout<T>(provider: LogisticsProvider, promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${provider} timed out after ${PROVIDER_RATE_TIMEOUT_MS}ms.`));
    }, PROVIDER_RATE_TIMEOUT_MS);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

export async function aggregateRates(input: RateInput): Promise<AggregatedRatesResult> {
  const startedAt = Date.now();
  const eligible = AGGREGATION_PROVIDERS.filter((p) => {
    const caps = getProviderCapabilities(p);
    return caps.configured && caps.supportsRates;
  });

  const settled = await Promise.allSettled(
    eligible.map(async (provider) => {
      const providerStartedAt = Date.now();
      const adapter = getLogisticsAdapter(provider);
      const rates = await withProviderTimeout(provider, adapter.getRates(input));
      console.info("[RateAggregatorProviderTiming]", {
        provider,
        durationMs: Date.now() - providerStartedAt,
        ratesCount: rates.length,
      });
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
    .flatMap((o) => o.rates)
    .filter(isCustomerVisibleRate);

  // Pipeline: reprice → deduplicate → rank
  const priced = rawRates.map(repriceRate);
  const deduped = deduplicateRates(priced);
  const ranked = rankRates(deduped);

  console.info("[RateAggregatorTiming]", {
    durationMs: Date.now() - startedAt,
    configuredCount: eligible.length,
    rawRatesCount: rawRates.length,
    returnedRatesCount: ranked.length,
  });

  return {
    rates: ranked,
    outcomes,
    queriedProviders: eligible,
    configuredCount: eligible.length,
  };
}
