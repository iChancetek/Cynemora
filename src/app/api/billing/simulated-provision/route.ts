/* ========================================
   CyneMora — Simulated Provision API Route
   Allows secure simulated upgrades in development
   ======================================== */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

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

    const { uid } = decoded;

    // 2. Parse the payload
    const body = await request.json();
    const { tier, credits } = body;

    if (!tier || !credits) {
      return NextResponse.json(
        { error: "Invalid provision details" },
        { status: 400 }
      );
    }

    console.log(`[Billing Dev Simulation] Securely provisioning simulated credits to UID: ${uid} for tier: ${tier}`);

    // Update balance and transaction logs atomically inside Firestore
    const balanceRef = adminDb.collection("creditBalances").doc(uid);
    const txRef = adminDb.collection("creditTransactions").doc();

    const batch = adminDb.batch();

    batch.set(balanceRef, {
      userId: uid,
      tier: tier,
      total: FieldValue.increment(Number(credits)),
      remaining: FieldValue.increment(Number(credits)),
      lastUpdated: new Date()
    }, { merge: true });

    batch.set(txRef, {
      userId: uid,
      amount: Number(credits),
      type: "credit",
      description: `Subscribed to CyneMora ${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier (Simulated)`,
      createdAt: new Date()
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Simulated subscription successfully provisioned for plan ${tier} with ${credits} credits.`
    });

  } catch (error: any) {
    console.error("[Simulated Provision API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
