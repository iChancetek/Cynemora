/* ========================================
   CyneMora — Render Status API Route
   Polls render operation status.
   When complete, downloads the video from
   Google's temporary URI and persists it
   in Firebase Storage so playback never
   depends on an expiring Gemini link.
   ======================================== */

import { NextRequest, NextResponse } from "next/server";
import { getRenderManager } from "@/lib/rendering/manager";
import { adminStorage } from "@/lib/firebase/admin";

// In-flight cache: avoid downloading the same operation twice when the
// client polls rapidly.  Maps operationId → Firebase Storage URL.
const persistedUrls = new Map<string, string>();

/**
 * Download a video from Google's temporary Gemini URI using the
 * server-side API key, upload it to Firebase Storage, and return
 * a permanent public download URL.
 */
async function persistToStorage(geminiUri: string, operationId: string): Promise<string> {
  // Already persisted in this process lifetime?
  const cached = persistedUrls.get(operationId);
  if (cached) return cached;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Status] GEMINI_API_KEY is not set — cannot download video");
    throw new Error("Server configuration error: missing GEMINI_API_KEY");
  }

  // Append API key to the Gemini download URL
  const separator = geminiUri.includes("?") ? "&" : "?";
  const authedUrl = `${geminiUri}${separator}key=${apiKey}`;

  const res = await fetch(authedUrl, { redirect: "follow" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[Status] Gemini download failed ${res.status}: ${body.substring(0, 300)}`);
    throw new Error(`Gemini download failed: ${res.status}`);
  }

  // Stream the response into a Buffer
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Determine content type
  const contentType = res.headers.get("Content-Type") || "video/mp4";

  // Generate a unique storage path
  const safeOpId = operationId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const storagePath = `renders/veo/${safeOpId}-${Date.now()}.mp4`;

  const bucket = adminStorage.bucket();
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: { contentType },
    public: true,
  });

  // Get the public URL
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  
  persistedUrls.set(operationId, publicUrl);
  console.log(`[Status] Video persisted: ${storagePath}`);

  return publicUrl;
}

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

    // When the video is ready and the URL is a temporary Gemini URI,
    // download it server-side and persist to Firebase Storage so the
    // client always receives a permanent, publicly-accessible URL.
    if (
      status.status === "completed" &&
      status.videoUrl &&
      status.videoUrl.includes("generativelanguage.googleapis.com")
    ) {
      try {
        status.videoUrl = await persistToStorage(status.videoUrl, operationId);
      } catch (persistErr) {
        console.error("[Status] Failed to persist video, falling back to proxy:", persistErr);
        // Fall back to the proxy route if persistence fails
        status.videoUrl = `/api/render/proxy?url=${encodeURIComponent(status.videoUrl)}`;
      }
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

