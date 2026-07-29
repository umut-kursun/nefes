import type {
  ClassificationCandidate,
  SemanticKind,
} from "../types/models/classify";

export const SEMANTIC_PRIORITY: Record<SemanticKind, number> = {
  barcode: 100,
  separator: 100,
  vat: 90,
  total: 85,
  subtotal: 84,
  payment: 80,
  discount: 75,
  charge: 70,
  receipt_number: 65,
  date: 64,
  time: 63,
  loyalty: 62,
  merchant: 55,
  product: 50,
  header: 40,
  footer: 35,
  other: 10,
  unknown: 0,
};

export interface ResolvedClassification {
  winner: ClassificationCandidate;
  alternatives: ClassificationCandidate[];
}

function candidateRank(candidate: ClassificationCandidate): number {
  const priority = SEMANTIC_PRIORITY[candidate.semanticKind];
  return priority * 1000 + candidate.confidence * 100;
}

export function resolveConflict(
  candidates: ClassificationCandidate[]
): ResolvedClassification {
  if (candidates.length === 0) {
    return {
      winner: {
        semanticKind: "unknown",
        confidence: 0.35,
        ruleId: "conflictResolver:fallback",
        reason: "no candidates",
      },
      alternatives: [],
    };
  }

  const sorted = [...candidates].sort((a, b) => {
    const rankDiff = candidateRank(b) - candidateRank(a);
    if (rankDiff !== 0) return rankDiff;
    return a.ruleId.localeCompare(b.ruleId);
  });

  const winner = sorted[0]!;
  const alternatives = sorted.slice(1);
  return { winner, alternatives };
}
