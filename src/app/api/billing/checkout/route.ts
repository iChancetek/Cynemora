/* ========================================
   CyneMora — Stripe Checkout API Route
   Creates Stripe session or mock testing session
   ======================================== */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { stripe } from "@/lib/stripe";
import { STRIPE_PRODUCTS } from "@/lib/stripe-products";

export async function POST(request: Request) {
  try {
    // 1. Verify user session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to upgrade." },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(sessionCookie);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid session. Please sign in again." },
        { status: 401 }
      );
    }

    const { uid, email } = decoded;

    // 2. Parse billing request details
    const body = await request.json();
    const { tier } = body; // 'standard' or 'premium'

    if (!tier || !STRIPE_PRODUCTS[tier]) {
      return NextResponse.json(
        { error: "Invalid plan tier requested. Choose 'standard' or 'premium'." },
        { status: 400 }
      );
    }

    const product = STRIPE_PRODUCTS[tier];
    const { origin } = new URL(request.url);

    // 3. Fallback/Simulation Check:
    // If Stripe Pricing is not yet configured or is in placeholder state,
    // trigger a developer simulation flow so they can test billing immediately!
    const isPlaceholder = product.priceId.includes("placeholder") || !process.env.STRIPE_SECRET_KEY;

    if (isPlaceholder) {
      console.log(`[Billing API] Simulated Checkout active for ${email} upgrading to ${tier}.`);
      
      // Simulate Stripe redirection by returning a simulated dashboard success link
      const simulatedSuccessUrl = `${origin}/dashboard/credits?simulated_checkout=success&tier=${tier}&credits=${product.credits}`;
      
      return NextResponse.json({
        success: true,
        simulated: true,
        url: simulatedSuccessUrl
      });
    }

    // 4. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: product.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription", // Subscriptions billing model
      client_reference_id: uid,
      customer_email: email || undefined,
      success_url: `${origin}/dashboard/credits?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url: `${origin}/dashboard/credits?checkout=cancelled`,
      metadata: {
        uid,
        tier,
        credits: String(product.credits),
        productName: product.name
      },
    });

    return NextResponse.json({
      success: true,
      simulated: false,
      url: session.url
    });

  } catch (error: any) {
    console.error("[Billing API] Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to initialize billing session", details: error.message },
      { status: 500 }
    );
  }
}
