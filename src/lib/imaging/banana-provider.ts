/* ========================================
   CyneMora — Banana Pro Image Provider
   High-fidelity photorealistic generation
   Server-side only
   ======================================== */

import {
  ImageProvider,
  ImageProviderConfig,
  ImageInstruction,
  ImageOperation,
  ImageResult,
} from "./provider";

const BANANA_CONFIG: ImageProviderConfig = {
  name: "Banana Pro",
  model: "banana-pro-v1",
  maxImages: 16,
  supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
  supportedStyles: [
    "photorealistic", "cinematic", "editorial", "product",
    "portrait", "fashion", "architectural", "food",
    "luxury", "commercial"
  ],
  supportsNegativePrompt: true,
  supportsReferenceImages: true,
  costMultiplier: 1.2,
  strengths: [
    "photorealistic", "marketing-visuals", "product-photography",
    "human-portraits", "cinematic-imagery", "high-detail-environments"
  ],
};

/**
 * Banana Pro image provider implementation.
 * Currently operates in simulation mode — when real API credentials
 * are configured, this will connect to the Banana Pro endpoints.
 *
 * Strengths:
 * - Photorealistic imagery
 * - Marketing visuals & product photography
 * - Human portraits
 * - Cinematic imagery
 * - High-detail environments
 */
export class BananaProProvider implements ImageProvider {
  readonly name = "banana-pro";
  readonly config = BANANA_CONFIG;

  /** In-memory store for completed operations */
  private completedOps = new Map<string, ImageResult>();

  constructor() {
    // Banana Pro will use BANANA_API_KEY when available
    // For now, it falls back to Gemini's image generation
  }

  async isAvailable(): Promise<boolean> {
    // Available if either native Banana key or Gemini fallback is configured
    return !!(process.env.BANANA_API_KEY || process.env.GEMINI_API_KEY);
  }

  async generateImages(instruction: ImageInstruction): Promise<ImageOperation> {
    const operationId = `banana-img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const numberOfImages = Math.min(instruction.numberOfImages || 1, this.config.maxImages);

      // If native Banana API key is present, use it
      if (process.env.BANANA_API_KEY) {
        return this.generateWithBananaAPI(operationId, instruction, numberOfImages);
      }

      // Fallback: Use Gemini with photorealistic style prompting
      return this.generateWithGeminiFallback(operationId, instruction, numberOfImages);
    } catch (error) {
      console.error("[BananaProProvider] Generation failed:", error);
      return {
        id: operationId,
        provider: this.name,
        status: "failed",
        error: (error as Error).message,
      };
    }
  }

  private async generateWithBananaAPI(
    operationId: string,
    instruction: ImageInstruction,
    numberOfImages: number
  ): Promise<ImageOperation> {
    // Future: Direct Banana Pro API integration
    // For now, return a placeholder that routes to Gemini
    return this.generateWithGeminiFallback(operationId, instruction, numberOfImages);
  }

  private async generateWithGeminiFallback(
    operationId: string,
    instruction: ImageInstruction,
    numberOfImages: number
  ): Promise<ImageOperation> {
    const { GoogleGenAI } = await import("@google/genai");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("No API key available for Banana Pro fallback");
    }

    const client = new GoogleGenAI({ apiKey });

    // Enhance prompt for photorealistic output (Banana Pro speciality)
    let enhancedPrompt = instruction.prompt;
    if (!instruction.style || instruction.style === "photorealistic") {
      enhancedPrompt = `Ultra photorealistic, professional photography, 8K resolution, masterful composition. ${instruction.prompt}`;
    } else {
      enhancedPrompt = `${instruction.prompt}. Style: ${instruction.style}, professional quality, highly detailed`;
    }

    if (instruction.negativePrompt) {
      enhancedPrompt += `. Avoid: ${instruction.negativePrompt}`;
    }

    const imageUrls: string[] = [];

    for (let i = 0; i < numberOfImages; i++) {
      const response = await client.models.generateContent({
        model: "gemini-2.0-flash-preview-image-generation",
        contents: enhancedPrompt,
        config: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      });

      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData?.mimeType?.startsWith("image/")) {
              const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              imageUrls.push(dataUrl);
            }
          }
        }
      }
    }

    if (imageUrls.length === 0) {
      return {
        id: operationId,
        provider: this.name,
        status: "failed",
        error: "No images generated",
      };
    }

    const result: ImageResult = {
      imageUrls,
      width: instruction.width || 1024,
      height: instruction.height || 1024,
      provider: this.name,
      prompt: instruction.prompt,
      metadata: {
        model: "banana-pro-v1 (gemini-fallback)",
        style: instruction.style || "photorealistic",
      },
    };
    this.completedOps.set(operationId, result);

    return {
      id: operationId,
      provider: this.name,
      status: "completed",
      progress: 100,
      imageUrls,
    };
  }

  async checkStatus(operationId: string): Promise<ImageOperation> {
    const result = this.completedOps.get(operationId);
    if (result) {
      return {
        id: operationId,
        provider: this.name,
        status: "completed",
        progress: 100,
        imageUrls: result.imageUrls,
      };
    }
    return {
      id: operationId,
      provider: this.name,
      status: "failed",
      error: "Operation not found",
    };
  }

  async getResult(operationId: string): Promise<ImageResult> {
    const result = this.completedOps.get(operationId);
    if (!result) {
      throw new Error(`Operation ${operationId} not found or not completed`);
    }
    return result;
  }

  async cancelGeneration(_operationId: string): Promise<void> {
    // No-op for synchronous generation
  }
}

// Singleton
let bananaInstance: BananaProProvider | null = null;

export function getBananaProProvider(): BananaProProvider {
  if (!bananaInstance) {
    bananaInstance = new BananaProProvider();
  }
  return bananaInstance;
}
