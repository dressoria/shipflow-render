import { getLogisticsAdapter } from "@/lib/logistics/registry";
import { getProviderCapabilities } from "@/lib/logistics/providerCapabilities";
import { rankRates } from "@/lib/logistics/rateRanking";
import type { LogisticsProvider, RateInput, RateResult } from "@/lib/logistics/types";

// Providers eligible for aggregation — internal/mock are excluded (fallback only)
const AGGREGATION_PROVIDERS: LogisticsProvider[] = ["shipstation", "shippo", "easypost", "easyship"];

type ProviderOutcome =
  | { provider: LogisticsProvider; rates: RateResult[]; ok: true }
  | { provider: LogisticsProvider; error: string; ok: false };

export type AggregatedRatesResult = {
  rates: RateResult[];   // ranked, tags populated
  outcomes: ProviderOutcome[];
  queriedProviders: LogisticsProvider[];
  configuredCount: number;
};

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

  const flat = outcomes
    .filter((o): o is Extract<ProviderOutcome, { ok: true }> => o.ok)
    .flatMap((o) => o.rates);

  const ranked = rankRates(flat);

  return {
    rates: ranked,
    outcomes,
    queriedProviders: eligible,
    configuredCount: eligible.length,
  };
}
