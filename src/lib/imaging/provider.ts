/* ========================================
   CyneMora — Image Provider Interface
   Provider-abstracted image generation
   ======================================== */

export interface ImageInstruction {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  style?: string;
  numberOfImages?: number;
  referenceImages?: string[];
  seed?: number;
}

export interface ImageOperation {
  id: string;
  provider: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  estimatedTimeMs?: number;
  imageUrls?: string[];
  error?: string;
}

export interface ImageResult {
  imageUrls: string[];
  width: number;
  height: number;
  provider: string;
  prompt: string;
  metadata?: Record<string, unknown>;
}

export interface ImageProviderConfig {
  name: string;
  model: string;
  maxImages: number;
  supportedAspectRatios: string[];
  supportedStyles: string[];
  supportsNegativePrompt: boolean;
  supportsReferenceImages: boolean;
  costMultiplier: number;
  /** Specialties this provider excels at */
  strengths: string[];
}

/**
 * Abstract image provider interface.
 * All image generation providers must implement this contract.
 * This ensures CyneMora remains provider-independent.
 */
export interface ImageProvider {
  readonly name: string;
  readonly config: ImageProviderConfig;

  /** Check if the provider is available and configured */
  isAvailable(): Promise<boolean>;

  /** Submit an image generation request */
  generateImages(instruction: ImageInstruction): Promise<ImageOperation>;

  /** Poll the status of an image generation operation (for async providers) */
  checkStatus(operationId: string): Promise<ImageOperation>;

  /** Retrieve the completed image result */
  getResult(operationId: string): Promise<ImageResult>;

  /** Cancel a pending/in-progress generation */
  cancelGeneration(operationId: string): Promise<void>;
}
