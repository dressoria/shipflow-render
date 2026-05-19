import Stripe from "stripe";

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
export const isStripeWebhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("Stripe is not configured on the server.");
  }

  stripeClient ??= new Stripe(secretKey, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });

  return stripeClient;
}

export function getStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error("Stripe webhook is not configured on the server.");
  }
  return webhookSecret;
}
