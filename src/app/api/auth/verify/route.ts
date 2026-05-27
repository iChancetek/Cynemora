/* ========================================
   Cynemora — Session Verification Route
   Returns current user info from session
   ======================================== */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(
      sessionCookie,
      true /* checkRevoked */
    );

    return NextResponse.json({
      user: {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
