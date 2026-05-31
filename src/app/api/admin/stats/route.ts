/* ========================================
   CyneMora — Admin Stats API Route
   Gathers platform analytics and usage stats
   ======================================== */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const PLATFORM_ADMINS = ["chancellor@ichancetek.com", "chanceminus@gmail.com"];

export async function GET() {
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

    // 2. Fetch data from Firebase Auth (limit to 1000 for stats check)
    const listUsersResult = await adminAuth.listUsers(1000);
    const users = listUsersResult.users;
    const totalUsers = users.length;
    const verifiedUsers = users.filter((u) => u.emailVerified).length;
    const recentSignupsCount = users.filter((u) => {
      const created = new Date(u.metadata.creationTime);
      const limit = new Date();
      limit.setDate(limit.getDate() - 7);
      return created > limit;
    }).length;

    // 3. Fetch data from renders collection
    const rendersSnapshot = await adminDb.collection("renders").get();
    const renders: any[] = [];
    rendersSnapshot.forEach((doc) => {
      renders.push({ id: doc.id, ...doc.data() });
    });

    const totalRenders = renders.length;
    const completedRenders = renders.filter((r) => r.status === "completed").length;
    const failedRenders = renders.filter((r) => r.status === "failed").length;
    const activeRenders = renders.filter((r) => r.status === "rendering" || r.status === "pending").length;

    // 4. Fetch data from trial_usage collection
    const usageSnapshot = await adminDb.collection("trial_usage").get();
    const trialUsages: any[] = [];
    usageSnapshot.forEach((doc) => {
      trialUsages.push({ id: doc.id, ...doc.data() });
    });

    const totalTrialsUsed = trialUsages.length;
    
    // Sum total duration of all generated videos
    let totalSecondsRendered = 0;
    trialUsages.forEach((u) => {
      totalSecondsRendered += Number(u.duration || 8);
    });

    // 5. Model usage distribution
    const modelUsageMap: { [key: string]: number } = {};
    trialUsages.forEach((u) => {
      const model = u.model || "veo-3.1-lite-generate-preview";
      modelUsageMap[model] = (modelUsageMap[model] || 0) + 1;
    });

    const modelUsage = Object.entries(modelUsageMap).map(([name, count]) => ({
      name,
      count,
    }));

    // 6. Recent activities combined feed (last 10 events)
    const combinedActivities: any[] = [];

    // Map recent trial usages to activity items
    trialUsages.forEach((u) => {
      const date = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
      combinedActivities.push({
        id: u.id,
        type: "generation",
        timestamp: date.toISOString(),
        username: u.username || "Anonymous Director",
        email: u.email || "unknown@cynemora.com",
        description: `Generated an ${u.duration || 8}s video with ${u.model || "Veo"}`,
        status: "success",
        ip: u.ip || "127.0.0.1"
      });
    });

    // Map recent signups to activity items
    users.forEach((u) => {
      combinedActivities.push({
        id: u.uid,
        type: "signup",
        timestamp: new Date(u.metadata.creationTime).toISOString(),
        username: u.displayName || u.email?.split("@")[0] || "New User",
        email: u.email || "",
        description: "Registered a new account",
        status: u.emailVerified ? "verified" : "unverified",
        ip: "N/A"
      });
    });

    // Sort combined activities descending by timestamp and take the top 10
    const recentActivities = combinedActivities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    // 7. Render performance metrics (averages)
    // For finished renders, calculate render time if startedAt and completedAt exist
    let totalRenderTimeMs = 0;
    let renderTimeCount = 0;
    renders.forEach((r) => {
      if (r.status === "completed" && r.startedAt && r.completedAt) {
        const start = r.startedAt.toDate ? r.startedAt.toDate().getTime() : new Date(r.startedAt).getTime();
        const end = r.completedAt.toDate ? r.completedAt.toDate().getTime() : new Date(r.completedAt).getTime();
        const duration = end - start;
        if (duration > 0) {
          totalRenderTimeMs += duration;
          renderTimeCount++;
        }
      }
    });
    const avgRenderTimeSec = renderTimeCount > 0 ? Math.round((totalRenderTimeMs / renderTimeCount) / 1000) : 45;

    // 8. 7-day timeline stats for charts
    const timelineData: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));

      // Renders on this day
      const dayRenders = renders.filter((r) => {
        const rDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
        return rDate >= dayStart && rDate <= dayEnd;
      }).length;

      // Users registered on this day
      const dayUsers = users.filter((u) => {
        const uDate = new Date(u.metadata.creationTime);
        return uDate >= dayStart && uDate <= dayEnd;
      }).length;

      // Generations on this day
      const dayGenerations = trialUsages.filter((u) => {
        const uDate = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
        return uDate >= dayStart && uDate <= dayEnd;
      }).length;

      timelineData.push({
        date: dateStr,
        renders: dayRenders,
        signups: dayUsers,
        generations: dayGenerations,
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          unverified: totalUsers - verifiedUsers,
          recentSignups: recentSignupsCount
        },
        renders: {
          total: totalRenders,
          completed: completedRenders,
          failed: failedRenders,
          active: activeRenders,
          avgTimeSec: avgRenderTimeSec
        },
        usage: {
          totalGenerations: totalTrialsUsed,
          totalDurationSec: totalSecondsRendered,
          modelBreakdown: modelUsage
        },
        timeline: timelineData,
        recentActivities
      }
    });

  } catch (error: any) {
    console.error("[API] Admin stats fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
