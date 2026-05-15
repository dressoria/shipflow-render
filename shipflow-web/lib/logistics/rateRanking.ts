import type { RateResult } from "@/lib/logistics/types";

// TODO: El modelo matemático final (margen por proveedor, confiabilidad estimada,
// penalizaciones por tiempo de entrega, preferencias del cliente) se definirá
// con criterios de negocio en una fase posterior.
// Este ranking es provisional y usa precio y tiempo estimado como proxy.

export type RateTag = "cheapest" | "fastest" | "recommended";

function parseDays(estimatedTime?: string): number | null {
  if (!estimatedTime) return null;
  const match = estimatedTime.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

export function rankRates(rates: RateResult[]): RateResult[] {
  if (rates.length === 0) return [];

  const withDays = rates.map((r) => ({ rate: r, days: parseDays(r.estimatedTime) }));

  const minPrice = Math.min(...rates.map((r) => r.customerPrice));

  const daysWithValue = withDays.filter((r) => r.days != null);
  const minDays = daysWithValue.length > 0 ? Math.min(...daysWithValue.map((r) => r.days!)) : null;

  let recommendedSet = false;

  return withDays.map(({ rate, days }) => {
    const tags: RateTag[] = [];

    if (rate.customerPrice === minPrice) tags.push("cheapest");
    if (days != null && minDays != null && days === minDays && rate.customerPrice !== minPrice) {
      tags.push("fastest");
    }
    // Provisional: first rate that has no other tag gets "recommended"
    if (tags.length === 0 && !recommendedSet) {
      tags.push("recommended");
      recommendedSet = true;
    }

    return { ...rate, tags };
  });
}
