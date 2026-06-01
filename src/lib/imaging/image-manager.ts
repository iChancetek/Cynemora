/* ========================================
   CyneMora — Image Provider Manager
   Intelligent routing for image generation
   Supports multi-provider strategy
   ======================================== */

import {
  ImageProvider,
  ImageInstruction,
  ImageOperation,
  ImageResult,
} from "./provider";
import { GeminiImageProvider, getGeminiImageProvider } from "./gemini-image-provider";
import { BananaProProvider, getBananaProProvider } from "./banana-provider";

export interface ImageProviderSelection {
  provider: ImageProvider;
  reason: string;
}

/** Prompt analysis keywords to route to the correct model */
const PHOTOREALISTIC_KEYWORDS = [
  "photo", "realistic", "product", "portrait", "headshot",
  "marketing", "advertisement", "commercial", "ecommerce",
  "professional", "studio", "lifestyle", "fashion", "luxury",
  "editorial", "campaign", "brand"
];

const CREATIVE_KEYWORDS = [
  "concept", "storyboard", "illustration", "cartoon", "anime",
  "sketch", "abstract", "fantasy", "surreal", "artistic",
  "watercolor", "painting", "design", "creative", "imaginative",
  "dreamlike", "whimsical"
];

/**
 * Image Manager — central routing layer for image generation.
 *
 * Responsible for:
 * - Intelligent provider selection based on prompt analysis
 * - Fallback routing when primary provider is unavailable
 * - Cost and quality optimization
 * - Abstracting provider details from the UI layer
 *
 * Routing strategy:
 * - Photorealistic/commercial → Banana Pro
 * - Creative/conceptual → Gemini 3 Pro Image
 * - Auto → Analyze prompt keywords and route intelligently
 */
export class ImageManager {
  private providers: Map<string, ImageProvider> = new Map();

  constructor() {
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    try {
      const gemini = getGeminiImageProvider();
      this.providers.set(gemini.name, gemini);
    } catch (error) {
      console.warn(
        "[ImageManager] Gemini Image provider unavailable:",
        (error as Error).message
      );
    }

    try {
      const banana = getBananaProProvider();
      this.providers.set(banana.name, banana);
    } catch (error) {
      console.warn(
        "[ImageManager] Banana Pro provider unavailable:",
        (error as Error).message
      );
    }
  }

  /** Register a new image provider */
  registerProvider(provider: ImageProvider): void {
    this.providers.set(provider.name, provider);
  }

  /** Get list of available providers */
  async getAvailableProviders(): Promise<string[]> {
    const available: string[] = [];
    for (const [name, provider] of this.providers) {
      if (await provider.isAvailable()) {
        available.push(name);
      }
    }
    return available;
  }

  /**
   * Analyze a prompt to determine whether it's better suited
   * for photorealistic (Banana Pro) or creative (Gemini) generation.
   */
  private analyzePrompt(prompt: string): "photorealistic" | "creative" | "neutral" {
    const lower = prompt.toLowerCase();

    let photoScore = 0;
    let creativeScore = 0;

    for (const keyword of PHOTOREALISTIC_KEYWORDS) {
      if (lower.includes(keyword)) photoScore++;
    }

    for (const keyword of CREATIVE_KEYWORDS) {
      if (lower.includes(keyword)) creativeScore++;
    }

    if (photoScore > creativeScore) return "photorealistic";
    if (creativeScore > photoScore) return "creative";
    return "neutral";
  }

  /** Select the best provider for a given instruction */
  async selectProvider(
    instruction: ImageInstruction,
    preferredProvider?: string
  ): Promise<ImageProviderSelection> {
    // 1. Explicit preference
    if (preferredProvider && preferredProvider !== "auto") {
      if (this.providers.has(preferredProvider)) {
        const provider = this.providers.get(preferredProvider)!;
        if (await provider.isAvailable()) {
          return { provider, reason: "User-selected provider" };
        }
      }
    }

    // 2. Auto-select: analyze prompt intent
    const intent = this.analyzePrompt(instruction.prompt);

    if (intent === "photorealistic") {
      const banana = this.providers.get("banana-pro");
      if (banana && await banana.isAvailable()) {
        return { provider: banana, reason: "Auto-routed: photorealistic content → Banana Pro" };
      }
    }

    if (intent === "creative") {
      const gemini = this.providers.get("gemini-image");
      if (gemini && await gemini.isAvailable()) {
        return { provider: gemini, reason: "Auto-routed: creative content → Gemini 3 Pro Image" };
      }
    }

    // 3. Neutral or fallback: prefer Gemini (lower cost)
    const gemini = this.providers.get("gemini-image");
    if (gemini && await gemini.isAvailable()) {
      return { provider: gemini, reason: "Default provider (Gemini 3 Pro Image)" };
    }

    // 4. Last resort: any available provider
    for (const [, provider] of this.providers) {
      if (await provider.isAvailable()) {
        return { provider, reason: "Fallback provider" };
      }
    }

    throw new Error("No image providers available");
  }

  /** Generate images using the best available provider */
  async generateImages(
    instruction: ImageInstruction,
    preferredProvider?: string
  ): Promise<ImageOperation & { providerUsed: string }> {
    const { provider, reason } = await this.selectProvider(
      instruction,
      preferredProvider
    );

    console.log(
      `[ImageManager] Using ${provider.name}: ${reason}`
    );

    const operation = await provider.generateImages(instruction);
    return { ...operation, providerUsed: provider.name };
  }

  /** Check image generation status */
  async checkStatus(
    operationId: string,
    providerName: string
  ): Promise<ImageOperation> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    return provider.checkStatus(operationId);
  }

  /** Get completed image result */
  async getResult(
    operationId: string,
    providerName: string
  ): Promise<ImageResult> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    return provider.getResult(operationId);
  }
}

// Singleton
let imageManagerInstance: ImageManager | null = null;

export function getImageManager(): ImageManager {
  if (!imageManagerInstance) {
    imageManagerInstance = new ImageManager();
  }
  return imageManagerInstance;
}
