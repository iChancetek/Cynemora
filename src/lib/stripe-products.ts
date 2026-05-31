/* ========================================
   CyneMora — Stripe Product Definitions
   Configurable price structures for billing
   ======================================== */

export interface StripeProduct {
  name: string;
  credits: number;
  priceId: string;
  tier: "standard" | "premium";
}

export const STRIPE_PRODUCTS: { [key: string]: StripeProduct } = {
  standard: {
    name: "Standard Plan",
    credits: 500,
    tier: "standard",
    // Pulls from environment variable or uses fallback placeholder
    priceId: process.env.STRIPE_PRICE_STANDARD || "price_standard_placeholder"
  },
  premium: {
    name: "Premium Plan",
    credits: 2000,
    tier: "premium",
    // Pulls from environment variable or uses fallback placeholder
    priceId: process.env.STRIPE_PRICE_PREMIUM || "price_premium_placeholder"
  }
};
