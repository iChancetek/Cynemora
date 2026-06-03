import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { adminStorage } from "@/lib/firebase/admin";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Route segment config
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for video processing

// Helper to resolve proxied or b64-wrapped URLs
function resolveUrl(url: string, origin: string): string {
  let decodedUrl = url;
  
  if (decodedUrl.startsWith("/")) {
    // Relative API URLs
    if (decodedUrl.startsWith("/api/render/proxy")) {
      try {
        const urlObj = new URL(decodedUrl, origin);
        const b64url = urlObj.searchParams.get("b64url");
        const paramUrl = urlObj.searchParams.get("url");
        if (b64url) {
          decodedUrl = Buffer.from(b64url, "base64").toString("utf-8");
        } else if (paramUrl) {
          decodedUrl = paramUrl;
        }
      } catch (e) {
        console.error("Failed to parse relative proxy URL:", e);
      }
    } else {
      // General relative path
      decodedUrl = `${origin}${decodedUrl}`;
    }
  }

  // Iteratively unwrap proxy prefixes
  while (true) {
    const proxyIdx = decodedUrl.indexOf("/api/render/proxy?url=");
    const b64ProxyIdx = decodedUrl.indexOf("/api/render/proxy?b64url=");
    
    if (proxyIdx !== -1) {
      decodedUrl = decodeURIComponent(decodedUrl.substring(proxyIdx + "/api/render/proxy?url=".length));
    } else if (b64ProxyIdx !== -1) {
      const b64Str = decodedUrl.substring(b64ProxyIdx + "/api/render/proxy?b64url=".length);
      try {
        decodedUrl = Buffer.from(b64Str, "base64").toString("utf-8");
      } catch (e) {
        break;
      }
    } else {
      break;
    }
  }

  // Decode double-encoded strings
  while (decodedUrl.includes("%3A%2F%2F") || decodedUrl.includes("%3a%2f%2f") || decodedUrl.startsWith("https%3A")) {
    decodedUrl = decodeURIComponent(decodedUrl);
  }

  if (decodedUrl.includes("generativelanguage.googleapis.com")) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const separator = decodedUrl.includes("?") ? "&" : "?";
      decodedUrl = `${decodedUrl}${separator}key=${apiKey}`;
    }
  }

  return decodedUrl;
}

/** Parse bucket name and object path from a Firebase Storage public URL */
function parseFirebaseStorageUrl(urlStr: string): { bucketName: string; objectPath: string } | null {
  try {
    const url = new URL(urlStr);
    
    // Check if it matches firebasestorage.googleapis.com or firebasestorage.app
    if (url.hostname === "firebasestorage.googleapis.com" || url.hostname === "firebasestorage.app" || url.hostname.endsWith(".firebasestorage.app")) {
      const pathParts = url.pathname.split("/");
      // Path format is /v0/b/{bucketName}/o/{objectPath}
      const bIndex = pathParts.indexOf("b");
      const oIndex = pathParts.indexOf("o");
      if (bIndex !== -1 && oIndex !== -1 && oIndex > bIndex + 1) {
        const bucketName = pathParts[bIndex + 1];
        const objectPathEncoded = pathParts.slice(oIndex + 1).join("/");
        const objectPath = decodeURIComponent(objectPathEncoded);
        return { bucketName, objectPath };
      }
    }
    
    // Also handle storage.googleapis.com/{bucketName}/{objectPath}
    if (url.hostname === "storage.googleapis.com") {
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2) {
        const bucketName = pathParts[0];
        const objectPath = decodeURIComponent(pathParts.slice(1).join("/"));
        return { bucketName, objectPath };
      }
    }
  } catch (e) {
    // Ignore invalid URLs
  }
  return null;
}

/** Attempt to fetch a URL with retries and proper headers */
async function fetchWithRetry(url: string, retries = 2): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "video/mp4,video/webm,video/*;q=0.9,*/*;q=0.5",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });

      if (response.ok) return response;

      console.warn(`[Stitch] Fetch attempt ${attempt + 1} failed for ${url}: ${response.status} ${response.statusText}`);
      
      // Don't retry on 403/404 - those won't change
      if (response.status === 403 || response.status === 404) {
        return null;
      }
    } catch (err: any) {
      console.warn(`[Stitch] Fetch attempt ${attempt + 1} threw for ${url}: ${err.message}`);
    }
    
    // Brief backoff before retry
    if (attempt < retries) {
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return null;
}

interface StitchClip {
  videoUrl: string;
  duration: number;
}

export async function POST(request: NextRequest) {
  let tempDir = "";
  try {
    const body = await request.json();
    const { clips } = body as { clips: StitchClip[] };

    if (!clips || !Array.isArray(clips) || clips.length === 0) {
      return NextResponse.json({ error: "Missing or invalid clips array" }, { status: 400 });
    }

    // Create temp directory for processing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cynemora-stitch-"));

    const standardizedPaths: string[] = [];
    const skippedClips: string[] = [];
    const origin = request.nextUrl.origin;

    // Process each clip
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const resolved = resolveUrl(clip.videoUrl, origin);

      console.log(`[Stitch] Processing clip ${i + 1}/${clips.length}: ${resolved.substring(0, 120)}...`);

      let buffer: Buffer;
      let contentType = "";

      const parsedFirebase = parseFirebaseStorageUrl(resolved);
      if (parsedFirebase) {
        try {
          console.log(`[Stitch] Downloading directly from Firebase Storage bucket '${parsedFirebase.bucketName}', path '${parsedFirebase.objectPath}'`);
          const bucket = adminStorage.bucket(parsedFirebase.bucketName);
          const file = bucket.file(parsedFirebase.objectPath);
          
          const [exists] = await file.exists();
          if (!exists) {
            throw new Error(`File does not exist in GCS bucket: ${parsedFirebase.objectPath}`);
          }
          
          const [metadata] = await file.getMetadata();
          contentType = metadata.contentType || "video/mp4";
          
          const [fileBuffer] = await file.download();
          buffer = fileBuffer;
        } catch (err: any) {
          console.warn(`[Stitch] Firebase GCS direct download failed for ${resolved}, falling back to HTTP fetch:`, err.message);
          
          const response = await fetchWithRetry(resolved);
          if (!response) {
            console.warn(`[Stitch] Skipping clip ${i} — could not download via GCS or HTTP: ${resolved}`);
            skippedClips.push(resolved.substring(0, 80));
            continue;
          }
          contentType = response.headers.get("content-type") || "";
          buffer = Buffer.from(await response.arrayBuffer());
        }
      } else {
        const response = await fetchWithRetry(resolved);
        if (!response) {
          console.warn(`[Stitch] Skipping clip ${i} — could not download: ${resolved}`);
          skippedClips.push(resolved.substring(0, 80));
          continue;
        }
        contentType = response.headers.get("content-type") || "";
        buffer = Buffer.from(await response.arrayBuffer());
      }

      const isImage = contentType.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(resolved);

      // Validate we got actual media data (not an error HTML page)
      if (buffer.length < 1000 && !isImage) {
        console.warn(`[Stitch] Skipping clip ${i} — response too small (${buffer.length} bytes), likely not a valid video`);
        skippedClips.push(resolved.substring(0, 80));
        continue;
      }

      const rawExt = isImage ? ".jpg" : ".mp4";
      const rawInputPath = path.join(tempDir, `raw_${i}${rawExt}`);
      await fs.writeFile(rawInputPath, buffer);

      const standardizedPath = path.join(tempDir, `standard_${i}.mp4`);

      // Standardize the asset (resolution 1280x720, 30fps, libx264, stereo AAC audio)
      await new Promise<void>((resolve, reject) => {
        let ffmpegCmd = ffmpeg();

        if (isImage) {
          ffmpegCmd
            .input(rawInputPath)
            .inputOptions(["-loop 1", `-t ${clip.duration}`])
            .input("anullsrc=channel_layout=stereo:sample_rate=44100")
            .inputOptions(["-f lavfi"]);
        } else {
          // Check if video has audio stream using ffprobe
          ffmpegCmd.input(rawInputPath);
        }

        // We apply scale, frame rate, pixel format, and pad/crop to 1280x720
        // -vf scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2
        // to maintain aspect ratio and fill the rest with black.
        ffmpegCmd
          .videoCodec("libx264")
          .outputOptions([
            "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
            "-r", "30",
            "-pix_fmt", "yuv420p",
            "-shortest"
          ]);

        // If it's a video, we want to map audio if it exists, otherwise add silent audio
        if (!isImage) {
          ffmpeg.ffprobe(rawInputPath, (err, metadata) => {
            if (err) {
              console.warn("ffprobe error, assuming no audio:", err);
              // Fallback: add silence
              ffmpeg()
                .input(rawInputPath)
                .input("anullsrc=channel_layout=stereo:sample_rate=44100")
                .inputOptions(["-f lavfi"])
                .videoCodec("libx264")
                .audioCodec("aac")
                .outputOptions([
                  "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
                  "-r", "30",
                  "-pix_fmt", "yuv420p",
                  "-shortest"
                ])
                .save(standardizedPath)
                .on("end", () => resolve())
                .on("error", (cmdErr) => reject(cmdErr));
            } else {
              const hasAudio = metadata.streams.some(s => s.codec_type === "audio");
              if (hasAudio) {
                ffmpegCmd
                  .audioCodec("aac")
                  .audioChannels(2)
                  .audioFrequency(44100);
              } else {
                // Add silent audio
                ffmpegCmd = ffmpeg()
                  .input(rawInputPath)
                  .input("anullsrc=channel_layout=stereo:sample_rate=44100")
                  .inputOptions(["-f lavfi"])
                  .videoCodec("libx264")
                  .audioCodec("aac")
                  .outputOptions([
                    "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
                    "-r", "30",
                    "-pix_fmt", "yuv420p",
                    "-shortest"
                  ]);
              }
              ffmpegCmd
                .save(standardizedPath)
                .on("end", () => resolve())
                .on("error", (cmdErr) => reject(cmdErr));
            }
          });
        } else {
          // It's an image, already set up above
          ffmpegCmd
            .audioCodec("aac")
            .save(standardizedPath)
            .on("end", () => resolve())
            .on("error", (cmdErr) => reject(cmdErr));
        }
      });

      standardizedPaths.push(standardizedPath);
    }

    // If no clips were successfully downloaded, return an error
    if (standardizedPaths.length === 0) {
      const errorMsg = skippedClips.length > 0
        ? `All ${clips.length} clips failed to download. This typically means the video URLs are expired or inaccessible. Skipped URLs: ${skippedClips.join(", ")}`
        : "No clips could be processed.";
      return NextResponse.json({ error: errorMsg }, { status: 422 });
    }

    // Now stitch the standardized clips together using the concat demuxer
    const listContent = standardizedPaths.map(p => `file '${p.replace(/\\/g, "/")}'`).join("\n");
    const listPath = path.join(tempDir, "list.txt");
    await fs.writeFile(listPath, listContent);

    const outputPath = path.join(tempDir, "output.mp4");

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions("-c copy")
        .save(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
    });

    const outputBuffer = await fs.readFile(outputPath);

    // Clean up files asynchronously in the background
    fs.rm(tempDir, { recursive: true, force: true }).catch(err => {
      console.error("Failed to clean up temp dir:", err);
    });

    // Build response with info about skipped clips if any
    const headers: Record<string, string> = {
      "Content-Type": "video/mp4",
      "Content-Disposition": 'attachment; filename="Cynemora-Final-Cut.mp4"',
      "Access-Control-Allow-Origin": "*"
    };
    
    if (skippedClips.length > 0) {
      headers["X-Skipped-Clips"] = String(skippedClips.length);
      console.warn(`[Stitch] Completed with ${skippedClips.length} skipped clips out of ${clips.length} total`);
    }

    return new NextResponse(outputBuffer, {
      status: 200,
      headers
    });

  } catch (error: any) {
    console.error("Video stitching API failed:", error);
    if (tempDir) {
      fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
    return NextResponse.json({ error: "Failed to stitch videos", details: error.message }, { status: 500 });
  }
}
