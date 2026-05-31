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
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
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

    // Rewrite authenticated Gemini URIs to go through our server-side proxy.
    // The browser's <video> element cannot add API key headers, so direct
    // generativelanguage.googleapis.com URIs always fail with
    // "no supported source was found". The proxy route adds the key server-side.
    if (status.videoUrl && status.videoUrl.includes("generativelanguage.googleapis.com")) {
      status.videoUrl = `/api/render/proxy?url=${encodeURIComponent(status.videoUrl)}`;
    }

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
