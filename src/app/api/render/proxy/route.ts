import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const isGemini = url.includes("generativelanguage.googleapis.com");
    
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5",
      "Accept-Language": "en-US,en;q=0.9"
    };
    
    if (isGemini) {
      fetchHeaders["x-goog-api-key"] = process.env.GEMINI_API_KEY || "";
      fetchHeaders["Referer"] = "https://google.com/";
    }

    const response = await fetch(url, { headers: fetchHeaders });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch remote video: ${response.status} ${response.statusText}`);
    }

    // Stream the body directly back to the client to avoid OOM crash or timeouts on large video files
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "video/mp4",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (error) {
    console.error("[API] Proxy error:", error);
    return NextResponse.json({ error: "Failed to proxy video" }, { status: 500 });
  }
}
