/* ========================================
   CyneMora — Core Type Definitions
   ======================================== */
import { Shot } from "./shot";

// ---- Project ----
export interface CyneMoraProject {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: "draft" | "planning" | "production" | "rendering" | "complete";
  tier: "standard" | "premium";
  createdAt: Date;
  updatedAt: Date;
  narrativeGraph?: NarrativeGraph;
  creditsUsed: number;
  creditsEstimated: number;
}

// ---- Narrative ----
export interface NarrativeGraph {
  id: string;
  projectId: string;
  title: string;
  logline: string;
  genre: string;
  tone: string;
  acts: Act[];
  characters: CharacterReference[];
  themes: string[];
  emotionalArc: EmotionalBeat[];
}

export interface Act {
  id: string;
  number: number;
  title: string;
  description: string;
  scenes: Scene[];
}

export interface Scene {
  id: string;
  actId: string;
  number: number;
  title: string;
  description: string;
  location: string;
  timeOfDay: string;
  mood: string;
  characters: string[];
  shots: Shot[];
  continuityNotes: string[];
}

export interface EmotionalBeat {
  sceneId: string;
  intensity: number; // 0-1
  emotion: string;
  description: string;
}

// ---- Characters ----
export interface CharacterReference {
  id: string;
  name: string;
  visualDnaId?: string;
}

export interface VisualDNA {
  id: string;
  projectId: string;
  characterName: string;
  appearance: {
    age: string;
    ethnicity: string;
    build: string;
    hairColor: string;
    hairStyle: string;
    eyeColor: string;
    distinguishingFeatures: string[];
  };
  wardrobe: WardrobeEntry[];
  expressions: ExpressionProfile[];
  motionStyle: string;
  voiceDescription: string;
  behavioralTraits: string[];
  referenceImages: string[]; // Firebase Storage URLs
}

export interface WardrobeEntry {
  id: string;
  name: string;
  description: string;
  sceneIds: string[];
}

export interface ExpressionProfile {
  emotion: string;
  description: string;
  intensity: number;
}
