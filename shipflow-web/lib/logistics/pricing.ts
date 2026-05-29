import type { PricingBreakdown } from "@/lib/logistics/types";

// Defaults — used when env vars are absent or parse to an invalid value.
const DEFAULT_MARKUP_PERCENTAGE = 0.06;       // 6%
const DEFAULT_MARKUP_MINIMUM = 0.99;          // $0.99 USD
const DEFAULT_PAYMENT_FEE_PERCENTAGE = 0.029; // 2.9%
const DEFAULT_PAYMENT_FEE_FIXED = 0.30;       // $0.30 USD

export type PricingConfig = {
  markupPercentage: number;      // decimal fraction, e.g. 0.06
  markupMinimum: number;         // USD, e.g. 0.99
  paymentFeePercentage: number;  // decimal fraction, e.g. 0.029
  paymentFeeFixed: number;       // USD, e.g. 0.30
};

export type PaymentFeeOptions = {
  percentage?: number;
  fixed?: number;
};

export type PricingOptions = {
  paymentFee?: PaymentFeeOptions;
};

function safeEnvFloat(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const v = parseFloat(raw);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

// Returns the current active pricing config.
// Reads env vars at call time — allows runtime override without redeployment.
//
// Supported environment variables (all optional, server-side only):
//   LABEL_MARKUP_PCT             — markup percentage, e.g. "0.06" for 6%
//   LABEL_MARKUP_MIN_USD         — minimum markup in USD, e.g. "0.99"
//   LABEL_PAYMENT_FEE_PCT        — payment processing fee %, e.g. "0.029" for 2.9%
//   LABEL_PAYMENT_FEE_FIXED_USD  — fixed payment processing fee in USD, e.g. "0.30"
export function getPricingConfig(): PricingConfig {
  return {
    markupPercentage: safeEnvFloat("LABEL_MARKUP_PCT", DEFAULT_MARKUP_PERCENTAGE),
    markupMinimum: safeEnvFloat("LABEL_MARKUP_MIN_USD", DEFAULT_MARKUP_MINIMUM),
    paymentFeePercentage: safeEnvFloat("LABEL_PAYMENT_FEE_PCT", DEFAULT_PAYMENT_FEE_PERCENTAGE),
    paymentFeeFixed: safeEnvFloat("LABEL_PAYMENT_FEE_FIXED_USD", DEFAULT_PAYMENT_FEE_FIXED),
  };
}

export function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function dollarsToCents(value: number): number {
  return Math.round(roundMoney(Math.max(0, value)) * 100);
}

function centsToDollars(value: number): number {
  return roundMoney(value / 100);
}

// platform_markup = max(markupMinimum, providerCost * markupPercentage)
export function calculatePlatformMarkup(providerCost: number, config?: PricingConfig): number {
  const cfg = config ?? getPricingConfig();
  if (providerCost <= 0) return cfg.markupMinimum;
  return roundMoney(Math.max(cfg.markupMinimum, providerCost * cfg.markupPercentage));
}

// Grossed-up payment_fee:
// customer_total_cents = ceil((subtotal_cents + fixed_fee_cents) / (1 - fee_pct))
// payment_fee = customer_total - subtotal
// ShipFlow does NOT absorb this fee — it is passed through to the customer.
export function calculatePaymentFee(subtotal: number, options?: PaymentFeeOptions): number {
  const cfg = getPricingConfig();
  const pct = options?.percentage ?? cfg.paymentFeePercentage;
  const fixed = options?.fixed ?? cfg.paymentFeeFixed;
  const subtotalCents = dollarsToCents(subtotal);
  const fixedCents = dollarsToCents(fixed);
  const denominator = 1 - pct;

  if (denominator <= 0) {
    return centsToDollars(fixedCents);
  }

  const customerTotalCents = Math.ceil((subtotalCents + fixedCents) / denominator);
  return centsToDollars(Math.max(0, customerTotalCents - subtotalCents));
}

// Full customer-facing price:
// customer_price = providerCost + platformMarkup + paymentFee
export function calculateCustomerPrice(
  providerCost: number,
  options?: PricingOptions,
): PricingBreakdown {
  const cfg = getPricingConfig();
  const safeProviderCost = roundMoney(Math.max(0, providerCost));
  const platformMarkup = calculatePlatformMarkup(safeProviderCost, cfg);
  const subtotal = roundMoney(safeProviderCost + platformMarkup);
  const paymentFee = calculatePaymentFee(subtotal, options?.paymentFee);
  const customerPrice = centsToDollars(dollarsToCents(subtotal) + dollarsToCents(paymentFee));

  return {
    providerCost: safeProviderCost,
    platformMarkup,
    subtotal,
    paymentFee,
    customerPrice,
    currency: "USD",
    markupPercentage: cfg.markupPercentage,
    markupMinimum: cfg.markupMinimum,
    paymentFeePercentage: options?.paymentFee?.percentage ?? cfg.paymentFeePercentage,
    paymentFeeFixed: options?.paymentFee?.fixed ?? cfg.paymentFeeFixed,
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
