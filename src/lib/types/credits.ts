/* ========================================
   CyneMora — Credit System Types
   ======================================== */

export type CreditUnitType =
  | "shot"
  | "sequence"
  | "character"
  | "continuity"
  | "export";

export interface CreditUnit {
  type: CreditUnitType;
  label: string;
  standardCost: number;
  premiumCost: number;
  description: string;
}

export const CREDIT_UNITS: Record<CreditUnitType, CreditUnit> = {
  shot: {
    type: "shot",
    label: "Shot Unit",
    standardCost: 5,
    premiumCost: 4,
    description: "Single cinematic shot render",
  },
  sequence: {
    type: "sequence",
    label: "Sequence Unit",
    standardCost: 15,
    premiumCost: 12,
    description: "Multi-shot sequence assembly",
  },
  character: {
    type: "character",
    label: "Character Unit",
    standardCost: 3,
    premiumCost: 2,
    description: "Visual DNA character generation",
  },
  continuity: {
    type: "continuity",
    label: "Continuity Unit",
    standardCost: 2,
    premiumCost: 1,
    description: "Cross-sequence continuity pass",
  },
  export: {
    type: "export",
    label: "Export Unit",
    standardCost: 5,
    premiumCost: 3,
    description: "Final render export",
  },
};

export interface CreditBalance {
  userId: string;
  total: number;
  used: number;
  remaining: number;
  tier: "standard" | "premium";
  lastUpdated: Date;
}

export interface CreditEstimate {
  breakdown: CreditLineItem[];
  total: number;
  remainingAfter: number;
  canAfford: boolean;
}

export interface CreditLineItem {
  unitType: CreditUnitType;
  quantity: number;
  costPerUnit: number;
  subtotal: number;
  description: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  projectId: string;
  type: "debit" | "credit" | "refund";
  amount: number;
  unitType: CreditUnitType;
  description: string;
  createdAt: Date;
}
