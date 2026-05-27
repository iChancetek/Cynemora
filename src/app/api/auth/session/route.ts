/* ========================================
   CyneMora — Session API Route
   Creates/destroys HTTP-only session cookies
   from Firebase ID tokens
   ======================================== */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

const SESSION_EXPIRY_MS = 60 * 60 * 24 * 14 * 1000; // 14 days

// POST — Create session cookie from Firebase ID token
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid ID token" },
        { status: 400 }
      );
    }

    // Verify the ID token and create a session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY_MS,
    });

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRY_MS / 1000,
    });

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Session creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 401 }
    );
  }
}

// DELETE — Destroy session cookie
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    // Revoke the session if it exists
    if (sessionCookie) {
      try {
        const decoded =
          await adminAuth.verifySessionCookie(sessionCookie);
        await adminAuth.revokeRefreshTokens(decoded.uid);
      } catch {
        // Cookie was already invalid — that's fine
      }
    }

    cookieStore.delete("__session");
    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Session deletion failed:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
