import type { PricingBreakdown } from "@/lib/logistics/types";

export function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function applyMarkup(providerCost: number, platformMarkup = 0): PricingBreakdown {
  const safeProviderCost = Math.max(0, providerCost);
  const safeMarkup = Math.max(0, platformMarkup);

  return {
    providerCost: roundMoney(safeProviderCost),
    platformMarkup: roundMoney(safeMarkup),
    customerPrice: roundMoney(safeProviderCost + safeMarkup),
    currency: "USD",
  };
}

export function calculateCustomerPrice(input: { providerCost: number; platformMarkup?: number }) {
  return applyMarkup(input.providerCost, input.platformMarkup ?? 0).customerPrice;
}
