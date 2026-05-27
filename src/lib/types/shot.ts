/* ========================================
   CyneMora — Shot & Sequence Types
   ======================================== */

// ---- Shot ----
export interface Shot {
  id: string;
  sceneId: string;
  number: number;
  type: ShotType;
  description: string;
  framing: ShotFraming;
  movement: CameraMovement;
  duration: number; // seconds
  emotion: string;
  environment: EnvironmentState;
  characters: ShotCharacter[];
  dialogue?: string;
  soundDesign?: string;
  continuityContext: ContinuityContext;
  compiledPrompt?: string;
  renderStatus: RenderStatus;
  videoUrl?: string; // Firebase Storage URL
  thumbnailUrl?: string;
}

export type ShotType =
  | "establishing"
  | "wide"
  | "medium"
  | "close-up"
  | "extreme-close-up"
  | "over-the-shoulder"
  | "point-of-view"
  | "dutch-angle"
  | "aerial"
  | "tracking"
  | "two-shot"
  | "insert"
  | "reaction";

export interface ShotFraming {
  angle: "eye-level" | "low" | "high" | "bird-eye" | "worm-eye" | "dutch";
  composition: string;
  focalLength: string; // e.g., "35mm", "85mm"
  depthOfField: "shallow" | "medium" | "deep";
}

export interface CameraMovement {
  type:
    | "static"
    | "pan"
    | "tilt"
    | "dolly"
    | "tracking"
    | "crane"
    | "handheld"
    | "steadicam"
    | "zoom"
    | "whip-pan"
    | "arc";
  direction?: string;
  speed: "slow" | "medium" | "fast";
  description: string;
}

export interface EnvironmentState {
  location: string;
  lighting: string;
  weather?: string;
  timeOfDay: string;
  atmosphere: string;
  colorPalette: string[];
}

export interface ShotCharacter {
  characterId: string;
  name: string;
  position: string;
  action: string;
  expression: string;
  wardrobeId?: string;
}

export interface ContinuityContext {
  previousShotId?: string;
  nextShotId?: string;
  environmentCarryover: boolean;
  characterStateNotes: string[];
  temporalRelation: "immediate" | "time-skip" | "flashback" | "flash-forward";
}

// ---- Sequence ----
export interface Sequence {
  id: string;
  projectId: string;
  title: string;
  description: string;
  shots: Shot[];
  order: number;
  totalDuration: number;
  continuityState: SequenceContinuityState;
  assembledVideoUrl?: string;
  status: "planning" | "rendering" | "assembled" | "exported";
}

export interface SequenceContinuityState {
  characterStates: Record<string, string>;
  environmentState: EnvironmentState;
  emotionalState: string;
  timelinePosition: string;
  cameraLanguage: string;
}

// ---- Render ----
export type RenderStatus =
  | "pending"
  | "queued"
  | "rendering"
  | "completed"
  | "failed"
  | "cancelled";

export interface RenderJob {
  id: string;
  title?: string;
  prompt?: string;
  shotId: string;
  projectId: string;
  userId: string;
  provider: string;
  status: RenderStatus;
  compiledPrompt: string;
  continuityContext: ContinuityContext;
  estimatedCredits: number;
  actualCredits?: number;
  operationId?: string; // Provider-specific operation ID
  videoUrl?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
