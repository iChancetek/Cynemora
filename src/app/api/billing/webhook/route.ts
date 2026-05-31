/* ========================================
   CyneMora — Stripe Webhook Endpoint
   Securely provisions credits upon checkout
   ======================================== */

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig || !webhookSecret) {
      console.error("[Webhook API] Missing stripe-signature or STRIPE_WEBHOOK_SECRET");
      return NextResponse.json(
        { error: "Stripe signature or webhook secret is missing" },
        { status: 400 }
      );
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (err: any) {
      console.error(`[Webhook API] Error verifying webhook signature: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook Signature Verification Failed: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      
      const uid = session.metadata?.uid || session.client_reference_id;
      const tier = session.metadata?.tier;
      const credits = Number(session.metadata?.credits || 0);
      const productName = session.metadata?.productName || "Standard Plan Upgrade";

      if (!uid || !tier || credits <= 0) {
        console.error("[Webhook API] Invalid metadata in checkout session:", session.metadata);
        return NextResponse.json(
          { error: "Invalid checkout session metadata metadata" },
          { status: 400 }
        );
      }

      console.log(`[Webhook API] Provisioning ${credits} credits to UID: ${uid} for tier: ${tier}`);

      // Perform atomic Firestore write to upgrade tier & credits
      const balanceRef = adminDb.collection("creditBalances").doc(uid);
      const txRef = adminDb.collection("creditTransactions").doc();

      const batch = adminDb.batch();

      // Upsert credit balance
      batch.set(balanceRef, {
        userId: uid,
        tier: tier,
        total: FieldValue.increment(credits),
        remaining: FieldValue.increment(credits),
        lastUpdated: new Date()
      }, { merge: true });

      // Log credit transaction
      batch.set(txRef, {
        userId: uid,
        amount: credits,
        type: "credit",
        description: `Subscribed to CyneMora ${productName}`,
        createdAt: new Date()
      });

      await batch.commit();
      console.log(`[Webhook API] Successfully provisioned credentials for UID: ${uid}`);
    }

    return NextResponse.json({ success: true, event: event.type });

  } catch (error: any) {
    console.error("[Webhook API] Internal error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed", details: error.message },
      { status: 500 }
    );
  }
}
