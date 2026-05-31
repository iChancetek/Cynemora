/* ========================================
   CyneMora — Admin Users API Route
   Manages user directory, lists and filters accounts
   ======================================== */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const PLATFORM_ADMINS = ["chancellor@ichancetek.com", "chanceminus@gmail.com"];

export async function GET(request: Request) {
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

    // Parse search parameters
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q")?.toLowerCase() || "";
    const filterVerified = searchParams.get("verified"); // 'true', 'false', or null

    // 2. Fetch users from Firebase Auth
    const listUsersResult = await adminAuth.listUsers(1000);
    const authUsers = listUsersResult.users;

    // 3. Fetch all trial usages to count/aggregate user actions
    const trialUsageSnapshot = await adminDb.collection("trial_usage").get();
    const usageMap: { [uid: string]: { count: number; totalDuration: number; lastIp: string; lastUsed: string; ips: Set<string> } } = {};

    trialUsageSnapshot.forEach((doc) => {
      const data = doc.data();
      const uid = data.uid;
      if (!uid) return;

      const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      const dateStr = date.toISOString();

      if (!usageMap[uid]) {
        usageMap[uid] = {
          count: 0,
          totalDuration: 0,
          lastIp: data.ip || "127.0.0.1",
          lastUsed: dateStr,
          ips: new Set<string>()
        };
      }

      usageMap[uid].count += 1;
      usageMap[uid].totalDuration += Number(data.duration || 8);
      if (data.ip) {
        usageMap[uid].ips.add(data.ip);
      }

      if (new Date(dateStr).getTime() > new Date(usageMap[uid].lastUsed).getTime()) {
        usageMap[uid].lastUsed = dateStr;
        if (data.ip) {
          usageMap[uid].lastIp = data.ip;
        }
      }
    });

    // 4. Fetch all video renders in parallel and group them by userId
    const rendersSnapshot = await adminDb.collection("renders").get();
    const rendersMap: { [uid: string]: any[] } = {};

    rendersSnapshot.forEach((doc) => {
      const data = doc.data();
      const userId = data.userId;
      if (!userId) return;

      const createdAtDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());

      if (!rendersMap[userId]) {
        rendersMap[userId] = [];
      }

      rendersMap[userId].push({
        id: doc.id,
        ...data,
        createdAt: createdAtDate.toISOString()
      });
    });

    // 5. Map and filter user profiles
    let filteredUsers = authUsers.map((u) => {
      const usage = usageMap[u.uid] || { count: 0, totalDuration: 0, lastIp: "N/A", lastUsed: "Never", ips: new Set<string>() };
      const emailLower = u.email?.toLowerCase() || "";
      const isUserAdmin = PLATFORM_ADMINS.includes(emailLower);
      const userRenders = rendersMap[u.uid] || [];

      // Sort user's renders by creation date descending
      userRenders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        uid: u.uid,
        email: u.email || "",
        displayName: u.displayName || u.email?.split("@")[0] || "Anonymous Director",
        photoURL: u.photoURL || null,
        emailVerified: u.emailVerified,
        disabled: u.disabled,
        creationTime: new Date(u.metadata.creationTime).toISOString(),
        lastSignInTime: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).toISOString() : null,
        role: isUserAdmin ? "admin" : "trial",
        videoCount: usage.count,
        totalDuration: usage.totalDuration,
        lastIp: usage.lastIp,
        lastUsed: usage.lastUsed,
        allIps: Array.from(usage.ips),
        renders: userRenders
      };
    });

    // Apply Search Query Filter
    if (searchQuery) {
      filteredUsers = filteredUsers.filter(
        (u) =>
          u.email.toLowerCase().includes(searchQuery) ||
          u.displayName.toLowerCase().includes(searchQuery) ||
          u.uid.toLowerCase().includes(searchQuery) ||
          u.lastIp.includes(searchQuery)
      );
    }

    // Apply Verification Status Filter
    if (filterVerified === "true") {
      filteredUsers = filteredUsers.filter((u) => u.emailVerified);
    } else if (filterVerified === "false") {
      filteredUsers = filteredUsers.filter((u) => !u.emailVerified);
    }

    // Sort by registration date descending (newest signups first)
    filteredUsers.sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());

    return NextResponse.json({
      success: true,
      users: filteredUsers
    });

  } catch (error: any) {
    console.error("[API] Admin users fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
