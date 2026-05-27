/* ========================================
   CyneMora — Render Status API Route
   Polls render operation status
   ======================================== */

import { NextRequest, NextResponse } from "next/server";
import { getRenderManager } from "@/lib/rendering/manager";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operationId = searchParams.get("operationId");
    const provider = searchParams.get("provider");

    if (!operationId || !provider) {
      return NextResponse.json(
        { error: "operationId and provider are required" },
        { status: 400 }
      );
    }

    if (provider === "mock-cinematic-provider") {
      const CINEMATIC_VIDEOS = [
        "https://assets.mixkit.co/videos/preview/mixkit-dramatic-moon-and-clouds-at-night-42289-large.mp4",
        "https://assets.mixkit.co/videos/preview/mixkit-astronaut-exploring-a-new-planet-31359-large.mp4",
        "https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-wet-rain-44589-large.mp4",
        "https://assets.mixkit.co/videos/preview/mixkit-mysterious-foggy-forest-with-shafts-of-sunlight-41589-large.mp4"
      ];
      return NextResponse.json({
        success: true,
        operation: {
          id: operationId,
          provider: provider,
          status: "completed",
          progress: 100,
          videoUrl: CINEMATIC_VIDEOS[Math.floor(Math.random() * CINEMATIC_VIDEOS.length)]
        },
      });
    }

    const manager = getRenderManager();
    const status = await manager.checkStatus(operationId, provider);

    return NextResponse.json({
      success: true,
      operation: status,
    });
  } catch (error) {
    console.error("[API] Render status error:", error);
    return NextResponse.json(
      {
        error: "Status check failed",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
