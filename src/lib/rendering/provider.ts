/* ========================================
   CyneMora — Render Provider Interface
   Provider-abstracted video generation
   ======================================== */

export interface ShotInstruction {
  prompt: string;
  duration?: number;
  resolution?: "720p" | "1080p";
  aspectRatio?: "16:9" | "9:16" | "1:1";
  style?: string;
  referenceImages?: string[];
  continuityContext?: {
    previousPrompt?: string;
    characterState?: string;
    environmentState?: string;
  };
}

export interface RenderOperation {
  id: string;
  provider: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  estimatedTimeMs?: number;
  videoUrl?: string;
}

export interface VideoResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
  provider: string;
  metadata?: Record<string, unknown>;
}

export interface RenderProviderConfig {
  name: string;
  model: string;
  maxDuration: number;
  supportedAspectRatios: string[];
  supportsAudio: boolean;
  supportsReferenceImages: boolean;
  costMultiplier: number;
}

/**
 * Abstract render provider interface.
 * All video generation providers must implement this contract.
 * This ensures CyneMora remains provider-independent.
 */
export interface RenderProvider {
  readonly name: string;
  readonly config: RenderProviderConfig;

  /** Check if the provider is available and configured */
  isAvailable(): Promise<boolean>;

  /** Submit a shot for rendering */
  generateShot(instruction: ShotInstruction): Promise<RenderOperation>;

  /** Poll the status of a render operation */
  checkStatus(operationId: string): Promise<RenderOperation>;

  /** Retrieve the completed video result */
  getResult(operationId: string): Promise<VideoResult>;

  /** Cancel a pending/in-progress render */
  cancelRender(operationId: string): Promise<void>;
}
