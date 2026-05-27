/* ========================================
   Cynemora — Render Provider Manager
   Routes render requests to appropriate providers
   Supports multi-provider strategy
   ======================================== */

import {
  RenderProvider,
  ShotInstruction,
  RenderOperation,
  VideoResult,
} from "./provider";
import { VeoProvider, getVeoProvider } from "./veo-provider";

export interface ProviderSelection {
  provider: RenderProvider;
  reason: string;
}

/**
 * Render Manager — central routing layer for video generation.
 *
 * Responsible for:
 * - Provider selection based on availability, quality, cost
 * - Fallback routing when primary provider is unavailable
 * - Abstracting provider details from the orchestration layer
 *
 * This enables Cynemora to remain provider-independent.
 * Future providers (OpenAI video, Runway, Luma, etc.) are added here.
 */
export class RenderManager {
  private providers: Map<string, RenderProvider> = new Map();
  private defaultProvider: string = "veo-3.1";

  constructor() {
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    try {
      const veo = getVeoProvider();
      this.providers.set(veo.name, veo);
    } catch (error) {
      console.warn(
        "[RenderManager] Veo provider unavailable:",
        (error as Error).message
      );
    }
  }

  /** Register a new render provider */
  registerProvider(provider: RenderProvider): void {
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

  /** Select the best provider for a given shot */
  async selectProvider(
    instruction: ShotInstruction,
    preferredProvider?: string
  ): Promise<ProviderSelection> {
    // Use preferred provider if specified and available
    if (preferredProvider && this.providers.has(preferredProvider)) {
      const provider = this.providers.get(preferredProvider)!;
      if (await provider.isAvailable()) {
        return { provider, reason: "User-preferred provider" };
      }
    }

    // Use default provider
    if (this.providers.has(this.defaultProvider)) {
      const provider = this.providers.get(this.defaultProvider)!;
      if (await provider.isAvailable()) {
        return { provider, reason: "Default provider (Veo 3.1)" };
      }
    }

    // Fallback: try any available provider
    for (const [, provider] of this.providers) {
      if (await provider.isAvailable()) {
        return { provider, reason: "Fallback provider" };
      }
    }

    throw new Error("No render providers available");
  }

  /** Generate a shot using the best available provider */
  async generateShot(
    instruction: ShotInstruction,
    preferredProvider?: string
  ): Promise<RenderOperation & { providerUsed: string }> {
    const { provider, reason } = await this.selectProvider(
      instruction,
      preferredProvider
    );

    console.log(
      `[RenderManager] Using ${provider.name}: ${reason}`
    );

    const operation = await provider.generateShot(instruction);
    return { ...operation, providerUsed: provider.name };
  }

  /** Check render status */
  async checkStatus(
    operationId: string,
    providerName: string
  ): Promise<RenderOperation> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    return provider.checkStatus(operationId);
  }

  /** Get completed render result */
  async getResult(
    operationId: string,
    providerName: string
  ): Promise<VideoResult> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    return provider.getResult(operationId);
  }
}

// Singleton
let renderManagerInstance: RenderManager | null = null;

export function getRenderManager(): RenderManager {
  if (!renderManagerInstance) {
    renderManagerInstance = new RenderManager();
  }
  return renderManagerInstance;
}
