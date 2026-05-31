/* ========================================
   CyneMora — Admin Renders API Route
   Lists all user renders and resolves creators
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
    const filterStatus = searchParams.get("status") || "all"; // 'all', 'completed', 'failed', 'rendering'
    const filterProvider = searchParams.get("provider") || "all";

    // 2. Fetch all users to resolve emails and names easily in-memory
    const listUsersResult = await adminAuth.listUsers(1000);
    const userMap: { [uid: string]: { email: string; displayName: string } } = {};
    listUsersResult.users.forEach((u) => {
      userMap[u.uid] = {
        email: u.email || "",
        displayName: u.displayName || u.email?.split("@")[0] || "Anonymous Director"
      };
    });

    // 3. Query all renders
    const rendersSnapshot = await adminDb.collection("renders").get();
    let renders: any[] = [];

    rendersSnapshot.forEach((doc) => {
      const data = doc.data();
      const userId = data.userId || "";
      const creator = userMap[userId] || { email: "unknown@cynemora.com", displayName: "Anonymous User" };

      const createdAtDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());

      renders.push({
        id: doc.id,
        ...data,
        createdAt: createdAtDate.toISOString(),
        creatorEmail: creator.email,
        creatorName: creator.displayName
      });
    });

    // 4. Apply Filters
    // Status Filter
    if (filterStatus !== "all") {
      renders = renders.filter((r) => r.status === filterStatus);
    }

    // Provider Filter
    if (filterProvider !== "all") {
      renders = renders.filter((r) => r.provider === filterProvider);
    }

    // Search Query Filter (search by prompt, user email, video title, or operation ID)
    if (searchQuery) {
      renders = renders.filter(
        (r) =>
          (r.prompt || "").toLowerCase().includes(searchQuery) ||
          (r.title || "").toLowerCase().includes(searchQuery) ||
          r.creatorEmail.toLowerCase().includes(searchQuery) ||
          r.creatorName.toLowerCase().includes(searchQuery) ||
          r.id.toLowerCase().includes(searchQuery)
      );
    }

    // 5. Sort by creation date descending (newest renders first)
    renders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      renders
    });

  } catch (error: any) {
    console.error("[API] Admin renders fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
