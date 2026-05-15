import type { PricingBreakdown } from "@/lib/logistics/types";

// TODO: Move these constants to DB/admin config when pricing model is finalized.
const MARKUP_PERCENTAGE = 0.06;
const MARKUP_MINIMUM = 0.99;
const PAYMENT_FEE_PERCENTAGE = 0.029;
const PAYMENT_FEE_FIXED = 0.30;

export type PaymentFeeOptions = {
  percentage?: number;
  fixed?: number;
};

export type PricingOptions = {
  paymentFee?: PaymentFeeOptions;
};

export function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

// platform_markup = max(MARKUP_MINIMUM, providerCost * MARKUP_PERCENTAGE)
export function calculatePlatformMarkup(providerCost: number): number {
  if (providerCost <= 0) return MARKUP_MINIMUM;
  return roundMoney(Math.max(MARKUP_MINIMUM, providerCost * MARKUP_PERCENTAGE));
}

// payment_fee is calculated on subtotal (providerCost + platformMarkup) and passed to the customer.
// ShipFlow does NOT absorb this fee.
export function calculatePaymentFee(subtotal: number, options?: PaymentFeeOptions): number {
  const pct = options?.percentage ?? PAYMENT_FEE_PERCENTAGE;
  const fixed = options?.fixed ?? PAYMENT_FEE_FIXED;
  return roundMoney(subtotal * pct + fixed);
}

// Full customer-facing price:
// customer_price = providerCost + platformMarkup + paymentFee
export function calculateCustomerPrice(
  providerCost: number,
  options?: PricingOptions,
): PricingBreakdown {
  const safeProviderCost = roundMoney(Math.max(0, providerCost));
  const platformMarkup = calculatePlatformMarkup(safeProviderCost);
  const subtotal = roundMoney(safeProviderCost + platformMarkup);
  const paymentFee = calculatePaymentFee(subtotal, options?.paymentFee);
  const customerPrice = roundMoney(subtotal + paymentFee);

  return {
    providerCost: safeProviderCost,
    platformMarkup,
    subtotal,
    paymentFee,
    customerPrice,
    currency: "USD",
    markupPercentage: MARKUP_PERCENTAGE,
    markupMinimum: MARKUP_MINIMUM,
    paymentFeePercentage: options?.paymentFee?.percentage ?? PAYMENT_FEE_PERCENTAGE,
    paymentFeeFixed: options?.paymentFee?.fixed ?? PAYMENT_FEE_FIXED,
  };
}

// Legacy helper — kept for backward compatibility with adapters.
// Does not apply payment fee; subtotal === customerPrice.
export function applyMarkup(providerCost: number, platformMarkup = 0): PricingBreakdown {
  const safe = roundMoney(Math.max(0, providerCost));
  const safeMarkup = roundMoney(Math.max(0, platformMarkup));
  const subtotal = roundMoney(safe + safeMarkup);
  return {
    providerCost: safe,
    platformMarkup: safeMarkup,
    subtotal,
    paymentFee: 0,
    customerPrice: subtotal,
    currency: "USD",
  };
}

