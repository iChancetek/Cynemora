/* ========================================
   CyneMora — Image Generation API Route
   Server-side image generation through
   provider-abstracted imaging layer
   ======================================== */

import { NextRequest, NextResponse } from "next/server";
import { getImageManager } from "@/lib/imaging/image-manager";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase/admin";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

// Platform administrators — full unrestricted access
const PLATFORM_ADMINS = [
  "chancellor@ichancetek.com",
  "chanceminus@gmail.com"
];

/**
 * Persist a base64 data URL image to Firebase Storage and return
 * a permanent public download URL.
 */
async function persistImageToStorage(
  dataUrl: string,
  userId: string,
  index: number
): Promise<string> {
  // Parse the data URL
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid data URL format");
  }

  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");

  // Determine file extension
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const storagePath = `images/${userId}/${Date.now()}-${index}.${ext}`;

  const bucket = adminStorage.bucket();
  const file = bucket.file(storagePath);
  const downloadToken = uuidv4();

  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
  return publicUrl;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to generate images." },
        { status: 401 }
      );
    }

    // Verify session cookie
    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid or expired session. Please sign in again." },
        { status: 401 }
      );
    }

    const { uid, email, name } = decoded;
    const isAdmin = PLATFORM_ADMINS.includes((email || "").toLowerCase());

    // MANDATORY: Force email verification (admins bypass)
    const userRecord = await adminAuth.getUser(uid);
    if (!isAdmin && !userRecord.emailVerified) {
      return NextResponse.json(
        { error: "Email verification required." },
        { status: 403 }
      );
    }

    // Get client IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
               request.headers.get("x-real-ip") ||
               "127.0.0.1";

    // Parse request body
    const body = await request.json();
    const {
      prompt,
      negativePrompt,
      aspectRatio,
      style,
      numberOfImages,
      provider: preferredProvider,
    } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Image prompt is required" },
        { status: 400 }
      );
    }

    const requestedCount = Math.min(numberOfImages || 1, 16);

    // Trial restrictions (admins bypass)
    if (!isAdmin) {
      const maxTrialImages = 4;
      if (requestedCount > maxTrialImages) {
        return NextResponse.json(
          { error: `Trial accounts are limited to ${maxTrialImages} images per generation.` },
          { status: 400 }
        );
      }

      // Check trial usage
      const [uidSnap, emailSnap, ipSnap] = await Promise.all([
        adminDb.collection("trial_usage").where("uid", "==", uid).where("type", "==", "image").get(),
        adminDb.collection("trial_usage").where("email", "==", email || "").where("type", "==", "image").get(),
        adminDb.collection("trial_usage").where("ip", "==", ip).where("type", "==", "image").get(),
      ]);

      const trialCount = Math.max(uidSnap.size, emailSnap.size, ipSnap.size);
      if (trialCount >= 5) {
        return NextResponse.json(
          { error: `Image trial limit reached. You have generated ${trialCount} batches. Upgrade to premium for unlimited generation.` },
          { status: 403 }
        );
      }
    }

    // Generate images
    const manager = getImageManager();
    const operation = await manager.generateImages(
      {
        prompt,
        negativePrompt,
        aspectRatio: aspectRatio || "1:1",
        style: style || undefined,
        numberOfImages: requestedCount,
      },
      preferredProvider
    );

    // If images were generated successfully, persist to Firebase Storage
    let persistedUrls: string[] = [];
    if (operation.status === "completed" && operation.imageUrls) {
      try {
        persistedUrls = await Promise.all(
          operation.imageUrls.map((url, idx) =>
            url.startsWith("data:")
              ? persistImageToStorage(url, uid, idx)
              : Promise.resolve(url)
          )
        );
        operation.imageUrls = persistedUrls;
      } catch (persistErr) {
        console.error("[Image API] Failed to persist images to Storage:", persistErr);
        // Continue with data URLs if persistence fails
        persistedUrls = operation.imageUrls;
      }
    }

    // Record usage
    const activeModel = operation.providerUsed || preferredProvider || "auto";
    const username = name || userRecord.displayName || email?.split("@")[0] || "Anonymous Creator";

    await adminDb.collection("trial_usage").add({
      uid,
      email: email || "",
      username,
      ip,
      type: "image",
      model: activeModel,
      imageCount: requestedCount,
      role: isAdmin ? "admin" : "trial",
      createdAt: new Date(),
    });

    // Save image metadata to Firestore
    if (operation.status === "completed" && persistedUrls.length > 0) {
      try {
        await adminDb.collection("generated_images").add({
          userId: uid,
          prompt,
          negativePrompt: negativePrompt || "",
          style: style || "default",
          aspectRatio: aspectRatio || "1:1",
          provider: operation.providerUsed || activeModel,
          imageUrls: persistedUrls,
          imageCount: persistedUrls.length,
          createdAt: new Date(),
          status: "completed",
        });
      } catch (saveErr) {
        console.warn("[Image API] Failed to save image metadata:", saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      operation: {
        id: operation.id,
        provider: operation.providerUsed || operation.provider,
        status: operation.status,
        imageUrls: operation.imageUrls || [],
        error: operation.error,
      },
    });
  } catch (error) {
    console.error("[API] Image generation error:", error);
    return NextResponse.json(
      {
        error: "Image generation failed",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
