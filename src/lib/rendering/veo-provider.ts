/* ========================================
   Cynemora — Veo 3.1 Render Provider
   Google Gemini API video generation
   Server-side only
   ======================================== */

import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import {
  RenderProvider,
  RenderProviderConfig,
  ShotInstruction,
  RenderOperation,
  VideoResult,
} from "./provider";

const VEO_CONFIG: RenderProviderConfig = {
  name: "Google Veo 3.1",
  model: "veo-3.1-generate-preview",
  maxDuration: 8, // seconds per generation
  supportedAspectRatios: ["16:9", "9:16", "1:1"],
  supportsAudio: true,
  supportsReferenceImages: true,
  costMultiplier: 1.0,
};

/**
 * Veo 3.1 render provider implementation.
 * Handles all video generation through Google's Gemini API.
 *
 * This provider:
 * - Receives compiled cinematic prompts from the intelligence layer
 * - Executes video generation via Veo 3.1
 * - Returns generated video URLs for storage
 *
 * It does NOT own: stories, continuity, orchestration, credits, or project state.
 */
export class VeoProvider implements RenderProvider {
  readonly name = "veo-3.1";
  readonly config = VEO_CONFIG;
  private client: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured. Veo provider cannot initialize."
      );
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  async isAvailable(): Promise<boolean> {
    try {
      return !!process.env.GEMINI_API_KEY;
    } catch {
      return false;
    }
  }

  async generateShot(instruction: ShotInstruction): Promise<RenderOperation> {
    try {
      const generateConfig: Record<string, unknown> = {};

      if (instruction.aspectRatio) {
        generateConfig.aspectRatio = instruction.aspectRatio;
      }

      if (instruction.referenceImages && instruction.referenceImages.length > 0) {
        generateConfig.referenceImages = instruction.referenceImages;
      }

      // Initiate asynchronous video generation
      const operation = await (this.client.models as any).generateVideos({
        model: VEO_CONFIG.model,
        prompt: instruction.prompt,
        config: generateConfig,
      });

      return {
        id: operation.name || `veo-${Date.now()}`,
        provider: this.name,
        status: "processing",
        estimatedTimeMs: 60000, // ~60s typical Veo generation
      };
    } catch (error) {
      console.error("[VeoProvider] Generation failed:", error);
      return {
        id: `veo-error-${Date.now()}`,
        provider: this.name,
        status: "failed",
      };
    }
  }

  async checkStatus(operationId: string): Promise<RenderOperation> {
    try {
      const op = new GenerateVideosOperation();
      op.name = operationId;

      // Poll the operation status using the correct SDK method: client.operations.getVideosOperation
      const operation = await (this.client.operations as any).getVideosOperation({
        operation: op
      });

      if (operation.done) {
        const video = operation.response?.generatedVideos?.[0];
        return {
          id: operationId,
          provider: this.name,
          status: "completed",
          progress: 100,
          videoUrl: video?.video?.uri || "",
        };
      }

      return {
        id: operationId,
        provider: this.name,
        status: "processing",
        progress: operation.metadata?.progress || 50,
      };
    } catch (error) {
      console.error("[VeoProvider] Status check failed:", error);
      return {
        id: operationId,
        provider: this.name,
        status: "failed",
      };
    }
  }

  async getResult(operationId: string): Promise<VideoResult> {
    try {
      const op = new GenerateVideosOperation();
      op.name = operationId;

      const operation = await (this.client.operations as any).getVideosOperation({
        operation: op
      });

      if (!operation.done) {
        throw new Error("Operation not yet completed");
      }

      const video = operation.response?.generatedVideos?.[0];

      return {
        videoUrl: video?.video?.uri || "",
        duration: VEO_CONFIG.maxDuration,
        width: 1920,
        height: 1080,
        hasAudio: VEO_CONFIG.supportsAudio,
        provider: this.name,
        metadata: {
          operationId,
          model: VEO_CONFIG.model,
        },
      };
    } catch (error) {
      console.error("[VeoProvider] Result retrieval failed:", error);
      throw error;
    }
  }

  async cancelRender(operationId: string): Promise<void> {
    try {
      await (this.client.operations as any).cancel({ name: operationId });
    } catch (error) {
      console.error("[VeoProvider] Cancel failed:", error);
    }
  }
}

// Singleton instance
let veoProviderInstance: VeoProvider | null = null;

export function getVeoProvider(): VeoProvider {
  if (!veoProviderInstance) {
    veoProviderInstance = new VeoProvider();
  }
  return veoProviderInstance;
}
