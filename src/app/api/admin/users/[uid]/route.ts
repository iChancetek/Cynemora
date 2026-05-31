/* ========================================
   CyneMora — Admin User Actions API
   Allows editing, resetting, and deleting users
   ======================================== */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const PLATFORM_ADMINS = ["chancellor@ichancetek.com", "chanceminus@gmail.com"];

// Ensure parameters are parsed correctly (awaiting params if Next.js asks)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    // 1. Verify admin session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie);
    if (!decoded.email || !PLATFORM_ADMINS.includes(decoded.email.toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { uid } = await params;
    if (!uid) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Admins cannot disable or unverify themselves
    if (uid === decoded.uid) {
      return NextResponse.json({ error: "Admins cannot modify their own active accounts" }, { status: 400 });
    }

    // Parse the payload
    const body = await request.json();
    const { action, value } = body;

    const userRecord = await adminAuth.getUser(uid);

    if (action === "toggle-verify") {
      const emailVerified = value === undefined ? !userRecord.emailVerified : !!value;
      await adminAuth.updateUser(uid, { emailVerified });
      return NextResponse.json({
        success: true,
        message: `User email verification status updated to ${emailVerified}`,
      });
    }

    if (action === "toggle-disable") {
      const disabled = value === undefined ? !userRecord.disabled : !!value;
      await adminAuth.updateUser(uid, { disabled });
      return NextResponse.json({
        success: true,
        message: `User account has been ${disabled ? "disabled" : "enabled"}`,
      });
    }

    if (action === "reset-trial") {
      // Find all trial usage logs for this UID and delete them in a batch
      const snapshot = await adminDb.collection("trial_usage").where("uid", "==", uid).get();
      if (!snapshot.empty) {
        const batch = adminDb.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
      return NextResponse.json({
        success: true,
        message: `User trial generation count has been successfully reset.`,
      });
    }

    if (action === "change-password") {
      const { password } = body;
      if (!password || typeof password !== "string" || password.length < 6) {
        return NextResponse.json(
          { error: "Password must be a string and at least 6 characters in length." },
          { status: 400 }
        );
      }
      await adminAuth.updateUser(uid, { password });
      return NextResponse.json({
        success: true,
        message: "User password has been successfully updated in Firebase authentication.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("[API] Admin user PATCH error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    // 1. Verify admin session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie);
    if (!decoded.email || !PLATFORM_ADMINS.includes(decoded.email.toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { uid } = await params;
    if (!uid) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (uid === decoded.uid) {
      return NextResponse.json({ error: "Admins cannot delete their own active accounts" }, { status: 400 });
    }

    // 2. Delete from Firebase Auth
    await adminAuth.deleteUser(uid);

    // 3. Delete trial usage documents
    const snapshot = await adminDb.collection("trial_usage").where("uid", "==", uid).get();
    if (!snapshot.empty) {
      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // 4. Delete associated renders (soft delete or hard delete?)
    const rendersSnap = await adminDb.collection("renders").where("userId", "==", uid).get();
    if (!rendersSnap.empty) {
      const batch = adminDb.batch();
      rendersSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: "User account and all associated trial metrics / render data have been fully deleted."
    });

  } catch (error: any) {
    console.error("[API] Admin user DELETE error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
