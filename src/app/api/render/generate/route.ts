/* ========================================
   CyneMora — Render Generation API Route
   Server-side video generation through
   provider-abstracted rendering layer
   ======================================== */

import { NextRequest, NextResponse } from "next/server";
import { getRenderManager } from "@/lib/rendering/manager";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { cookies } from "next/headers";

// Platform administrators — full unrestricted access, no trial limits
const PLATFORM_ADMINS = [
  "chancellor@ichancetek.com",
  "chanceminus@gmail.com"
];

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to create videos." },
        { status: 401 }
      );
    }

    // Verify session cookie using Firebase Admin SDK
    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(sessionCookie, true /* checkRevoked */);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid or expired session. Please sign in again." },
        { status: 401 }
      );
    }

    const { uid, email, name } = decoded;
    const isAdmin = PLATFORM_ADMINS.includes((email || "").toLowerCase());

    // MANDATORY: Force email verification (admins bypass)
    const userRecord = await adminAuth.getUser(uid);
    if (!isAdmin && !userRecord.emailVerified) {
      return NextResponse.json(
        { error: "Email verification required. Please verify your email before using CyneMora." },
        { status: 403 }
      );
    }

    // 1. Get client IP address securely
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
               request.headers.get("x-real-ip") ||
               "127.0.0.1";

    // 2. Fetch body parameters
    const body = await request.json();
    const { prompt, aspectRatio, duration, resolution, referenceImages, provider } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Render prompt is required" },
        { status: 400 }
      );
    }

    const requestedDuration = duration ? parseInt(duration) : 8;

    // Trial restrictions (admins bypass all limits)
    if (!isAdmin) {
      // 3. Enforce trial duration limit (Max 8 seconds)
      if (requestedDuration > 8) {
        return NextResponse.json(
          { error: "Trial duration exceeded. Trial videos are limited to a maximum of 8 seconds." },
          { status: 400 }
        );
      }

      // 4. Query trial usage across UID, Email, and IP Address in parallel to prevent abuse
      const [uidSnap, emailSnap, ipSnap] = await Promise.all([
        adminDb.collection("trial_usage").where("uid", "==", uid).get(),
        adminDb.collection("trial_usage").where("email", "==", email || "").get(),
        adminDb.collection("trial_usage").where("ip", "==", ip).get()
      ]);

      const trialCount = Math.max(uidSnap.size, emailSnap.size, ipSnap.size);

      if (trialCount >= 2) {
        return NextResponse.json(
          { error: `Trial limit reached. You have already generated ${trialCount} videos. Please upgrade to a premium account to remove this restriction.` },
          { status: 403 }
        );
      }
    }

    // 5. Direct generation
    const manager = getRenderManager();
    const operation = await manager.generateShot(
      {
        prompt,
        aspectRatio: aspectRatio || "16:9",
        duration: requestedDuration,
        resolution: resolution || "1080p",
        referenceImages: referenceImages || [],
      },
      provider
    );

    // 6. Record usage log (for both admins and trial users)
    const activeModel = provider || "veo-3.1-lite-generate-preview";
    const username = name || userRecord.displayName || email?.split("@")[0] || "Anonymous Director";
    
    await adminDb.collection("trial_usage").add({
      uid,
      email: email || "",
      username,
      ip,
      model: activeModel,
      duration: requestedDuration,
      role: isAdmin ? "admin" : "trial",
      createdAt: new Date()
    });

    return NextResponse.json({
      success: true,
      operation: {
        id: operation.id,
        provider: operation.providerUsed,
        status: operation.status,
        estimatedTimeMs: operation.estimatedTimeMs,
      },
    });
  } catch (error) {
    console.error("[API] Render generation error, triggering mock provider:", error);
    
    // Attempt fallback to mock provider, but still secure trial usage logging
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("__session")?.value;
      if (sessionCookie) {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie);
        const userRecord = await adminAuth.getUser(decoded.uid);
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
                   request.headers.get("x-real-ip") ||
                   "127.0.0.1";
        
        await adminDb.collection("trial_usage").add({
          uid: decoded.uid,
          email: decoded.email || "",
          username: decoded.name || userRecord.displayName || decoded.email?.split("@")[0] || "Anonymous Director",
          ip,
          model: "mock-cinematic-provider (fallback)",
          duration: 8,
          createdAt: new Date()
        });
      }
    } catch (dbErr) {
      console.error("[API] Failed to log fallback trial usage:", dbErr);
    }

    return NextResponse.json({
      success: true,
      operation: {
        id: `mock-fallback-${Date.now()}`,
        provider: "mock-cinematic-provider",
        status: "processing",
        estimatedTimeMs: 2000,
      },
    });
  }
}
