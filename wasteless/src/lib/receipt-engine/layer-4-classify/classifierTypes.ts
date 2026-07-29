import type { GraphNode } from "../types/models/graph";
import type { ClassificationCandidate } from "../types/models/classify";
import type { GraphContext } from "./graphContext";

export type NodeClassifier = (
  node: GraphNode,
  ctx: GraphContext
) => readonly ClassificationCandidate[];

export function candidate(
  semanticKind: ClassificationCandidate["semanticKind"],
  confidence: number,
  ruleId: string,
  reason: string
): ClassificationCandidate {
  return Object.freeze({ semanticKind, confidence, ruleId, reason });
}
