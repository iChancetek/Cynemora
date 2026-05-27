/* ========================================
   Cynemora — Credit System
   Provider-independent cost abstraction
   ======================================== */

import {
  CreditUnitType,
  CREDIT_UNITS,
  CreditEstimate,
  CreditLineItem,
} from "@/lib/types/credits";

/**
 * Calculate credit cost for a generation action.
 * Credits are abstracted from provider pricing —
 * Cynemora sets internal rates independent of Veo/OpenAI costs.
 */
export function estimateCredits(
  items: { type: CreditUnitType; quantity: number }[],
  tier: "standard" | "premium"
): CreditEstimate {
  const breakdown: CreditLineItem[] = items.map((item) => {
    const unit = CREDIT_UNITS[item.type];
    const costPerUnit =
      tier === "premium" ? unit.premiumCost : unit.standardCost;

    return {
      unitType: item.type,
      quantity: item.quantity,
      costPerUnit,
      subtotal: costPerUnit * item.quantity,
      description: `${item.quantity}x ${unit.label}`,
    };
  });

  const total = breakdown.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    breakdown,
    total,
    remainingAfter: 0, // Filled by the caller with actual balance
    canAfford: false, // Filled by the caller
  };
}

/**
 * Estimate credits for a full production plan.
 */
export function estimateProductionCredits(
  shotCount: number,
  sequenceCount: number,
  characterCount: number,
  tier: "standard" | "premium"
): CreditEstimate {
  return estimateCredits(
    [
      { type: "shot", quantity: shotCount },
      { type: "sequence", quantity: sequenceCount },
      { type: "character", quantity: characterCount },
      { type: "continuity", quantity: sequenceCount }, // One continuity pass per sequence
    ],
    tier
  );
}
