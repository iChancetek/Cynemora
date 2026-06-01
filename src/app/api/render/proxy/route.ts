import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let b64url = searchParams.get("b64url");
  let url = searchParams.get("url");

  if (b64url) {
    try {
      url = Buffer.from(b64url, 'base64').toString('utf-8');
    } catch (e) {
      return NextResponse.json({ error: "Invalid base64 url parameter" }, { status: 400 });
    }
  }

  if (!url) {
    return NextResponse.json({ error: "Missing url or b64url parameter" }, { status: 400 });
  }

  // Iteratively unwrap any proxy prefixes (absolute or relative)
  while (true) {
    const proxyIdx = url.indexOf("/api/render/proxy?url=");
    const b64ProxyIdx = url.indexOf("/api/render/proxy?b64url=");
    
    if (proxyIdx !== -1) {
      url = decodeURIComponent(url.substring(proxyIdx + "/api/render/proxy?url=".length));
    } else if (b64ProxyIdx !== -1) {
      const b64Str = url.substring(b64ProxyIdx + "/api/render/proxy?b64url=".length);
      try {
        url = Buffer.from(b64Str, 'base64').toString('utf-8');
      } catch (e) {
        break;
      }
    } else {
      break;
    }
  }

  // Robustly decode if it's double-encoded
  while (url.includes("%3A%2F%2F") || url.includes("%3a%2f%2f") || url.startsWith("https%3A")) {
    url = decodeURIComponent(url);
  }
  
  if (url.startsWith("/")) {
    return NextResponse.json({ error: "Invalid absolute URL" }, { status: 400 });
  }

  try {
    // Validate URL parse
    new URL(url);
  } catch (e) {
    return NextResponse.json({ error: `Invalid URL format: ${url}` }, { status: 400 });
  }

  try {
    const isGemini = url.includes("generativelanguage.googleapis.com");
    
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5",
      "Accept-Language": "en-US,en;q=0.9"
    };
    
    if (isGemini) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        // Use query param for key to avoid header stripping issues in some environments
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}key=${apiKey}`;
      }
    }

    const response = await fetch(url, { headers: fetchHeaders, redirect: 'follow' });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown body");
      console.error(`[API] Proxy remote fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
      // Return the actual error message to the client so we can debug production issues easily
      return NextResponse.json({ 
        error: `Failed to fetch remote video: ${response.status} ${response.statusText}`,
        details: errorText.substring(0, 500)
      }, { status: response.status >= 400 ? response.status : 500 });
    }

    // Stream the body directly back to the client
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "video/mp4",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (error: any) {
    console.error("[API] Proxy error exception:", error);
    return NextResponse.json({ error: "Failed to proxy video", details: error.message }, { status: 500 });
  }
}
