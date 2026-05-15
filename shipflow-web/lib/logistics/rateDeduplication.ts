import type { RateResult } from "@/lib/logistics/types";

// Normalizes carrier/service names to a stable key for grouping.
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Extracts a day-count string from estimatedTime (e.g. "3 day(s)" → "3").
function extractDays(estimatedTime?: string): string {
  if (!estimatedTime) return "x";
  const m = estimatedTime.match(/\d+/);
  return m ? m[0] : "x";
}

// Group key: normalized carrier + normalized service + estimated days.
// Rates with the same key represent equivalent options across providers.
function groupKey(rate: RateResult): string {
  const carrier = normalize(rate.courierName || rate.courierId);
  const service = normalize(rate.serviceName || rate.serviceCode);
  const days = extractDays(rate.estimatedTime);
  return `${carrier}__${service}__${days}`;
}

// De-duplicates rates by (carrier, service, delivery days).
// For each group, keeps the rate with the lowest providerCost (the winner).
// The winner's provider and internal metadata are preserved for label creation.
export function deduplicateRates(rates: RateResult[]): RateResult[] {
  const winners = new Map<string, RateResult>();

  for (const rate of rates) {
    const key = groupKey(rate);
    const current = winners.get(key);
    const cost = rate.pricing.providerCost;

    if (!current || cost < current.pricing.providerCost) {
      winners.set(key, rate);
    }
  }

  return Array.from(winners.values());
}
