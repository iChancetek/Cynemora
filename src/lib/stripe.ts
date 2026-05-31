/* ========================================
   CyneMora — Stripe Server Initializer
   Sets up server-side Stripe SDK config
   ======================================== */

import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[Billing] WARNING: STRIPE_SECRET_KEY environment variable is missing. Stripe checkout sessions will operate in simulated/fallback mode.");
}

export const stripe = new Stripe(stripeSecretKey, {
  // Uses latest stable Stripe API version
  apiVersion: "2024-04-10" as any,
  typescript: true
});
