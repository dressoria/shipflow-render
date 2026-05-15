import type { RateResult } from "@/lib/logistics/types";

// TODO: The final scoring model (provider reliability, delivery guarantees, customer preferences)
// will be defined with business criteria in a future phase.
// This ranking uses price and delivery speed as initial proxies.

export type RateTag = "cheapest" | "fastest" | "recommended";

function parseDays(estimatedTime?: string): number | null {
  if (!estimatedTime) return null;
  const match = estimatedTime.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

export function rankRates(rates: RateResult[]): RateResult[] {
  if (rates.length === 0) return [];

  // Single rate: mark it as cheapest (no competition to rank against).
  if (rates.length === 1) {
    return [{ ...rates[0], tags: ["cheapest"] }];
  }

  const prices = rates.map((r) => r.customerPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  const days = rates.map((r) => parseDays(r.estimatedTime));
  const daysWithData = days.filter((d): d is number => d != null);
  const hasSpeedData = daysWithData.length >= 2;
  const minDays = hasSpeedData ? Math.min(...daysWithData) : null;
  const maxDays = hasSpeedData ? Math.max(...daysWithData) : null;
  const daysRange =
    hasSpeedData && minDays != null && maxDays != null ? maxDays - minDays : 0;

  // Score per rate: lower = better overall option.
  // normalizedPrice: 0 = cheapest, 1 = most expensive
  // normalizedSpeed: 0 = fastest, 1 = slowest; 0.5 if rate has no speed data
  const scores = rates.map((rate, i) => {
    const np = priceRange > 0 ? (rate.customerPrice - minPrice) / priceRange : 0;
    let ns = 0;
    if (hasSpeedData) {
      const d = days[i];
      ns = d != null ? (daysRange > 0 ? (d - minDays!) / daysRange : 0) : 0.5;
    }
    return np * 0.65 + ns * 0.35;
  });

  const minScore = Math.min(...scores);
  const recommendedIdx = scores.indexOf(minScore);

  return rates.map((rate, i) => {
    const tags: RateTag[] = [];

    if (rate.customerPrice === minPrice) tags.push("cheapest");

    const d = days[i];
    if (hasSpeedData && d === minDays && rate.customerPrice !== minPrice) {
      tags.push("fastest");
    }

    // Recommended: best-score rate; only applied when it's not already tagged as cheapest+fastest.
    if (i === recommendedIdx && !tags.includes("cheapest") && !tags.includes("fastest")) {
      tags.push("recommended");
    }

    return { ...rate, tags };
  });
}
