import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Route segment config
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for video processing

// Helper to resolve proxied or b64-wrapped URLs
function resolveUrl(url: string): string {
  let decodedUrl = url;
  
  if (decodedUrl.startsWith("/")) {
    // Relative API URLs
    if (decodedUrl.startsWith("/api/render/proxy")) {
      const dummyBase = "http://localhost:3000";
      try {
        const urlObj = new URL(decodedUrl, dummyBase);
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

  if (decodedUrl.includes("gtv-videos-bucket/sample/")) {
    if (decodedUrl.includes("ForBiggerFun.mp4")) {
      decodedUrl = "https://media.w3.org/2010/05/sintel/trailer_hd.mp4";
    } else if (decodedUrl.includes("ForBiggerBlazes.mp4")) {
      decodedUrl = "https://www.w3schools.com/html/mov_bbb.mp4";
    } else if (decodedUrl.includes("ForBiggerEscapes.mp4")) {
      decodedUrl = "https://media.w3.org/2010/05/bunny/trailer.mp4";
    } else if (decodedUrl.includes("ForBiggerJoyrides.mp4")) {
      decodedUrl = "https://media.w3.org/2010/05/video/movie_300.mp4";
    }
  }

  return decodedUrl;
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

    // Process each clip
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const resolved = resolveUrl(clip.videoUrl);

      // Download original asset
      const response = await fetch(resolved, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch clip URL: ${resolved} (${response.status} ${response.statusText})`);
      }

      const contentType = response.headers.get("content-type") || "";
      const isImage = contentType.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(resolved);

      const buffer = Buffer.from(await response.arrayBuffer());
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

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="Cynemora-Final-Cut.mp4"',
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error: any) {
    console.error("Video stitching API failed:", error);
    if (tempDir) {
      fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
    return NextResponse.json({ error: "Failed to stitch videos", details: error.message }, { status: 500 });
  }
}
