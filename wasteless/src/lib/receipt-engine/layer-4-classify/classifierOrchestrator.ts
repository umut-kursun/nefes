import type { GraphNode } from "../types/models/graph";
import type {
  ClassificationCandidate,
  ClassifiedNode,
} from "../types/models/classify";
import { clampConfidence, CONFIDENCE } from "../types/provenance";
import type { NodeClassifier } from "./classifierTypes";
import { resolveConflict } from "./conflictResolver";
import { GraphContext } from "./graphContext";
import { amountClassifier } from "./rules/amountClassifier";
import { chargeClassifier } from "./rules/chargeClassifier";
import { discountClassifier } from "./rules/discountClassifier";
import { footerClassifier } from "./rules/footerClassifier";
import { headerClassifier } from "./rules/headerClassifier";
import { metadataClassifier } from "./rules/metadataClassifier";
import { paymentClassifier } from "./rules/paymentClassifier";
import { productCandidateClassifier } from "./rules/productCandidateClassifier";
import { vatClassifier } from "./rules/vatClassifier";
import { candidate } from "./classifierTypes";
import { RULE_CONFIDENCE } from "./constants";

const CLASSIFIERS: readonly NodeClassifier[] = [
  headerClassifier,
  footerClassifier,
  vatClassifier,
  paymentClassifier,
  discountClassifier,
  chargeClassifier,
  amountClassifier,
  productCandidateClassifier,
  metadataClassifier,
];

function fallbackCandidate(node: GraphNode): ClassificationCandidate {
  if (node.kind === "raw_line") {
    return candidate(
      "other",
      RULE_CONFIDENCE.fallback,
      "classifierOrchestrator:raw_line",
      "unclassified raw line container"
    );
  }
  return candidate(
    "unknown",
    RULE_CONFIDENCE.fallback,
    "classifierOrchestrator:unknown",
    "no classification rule matched"
  );
}

function buildClassifiedNode(
  graphNode: GraphNode,
  winner: ClassificationCandidate,
  alternatives: ClassificationCandidate[]
): ClassifiedNode {
  return Object.freeze({
    id: graphNode.id,
    graphNodeId: graphNode.id,
    semanticKind: winner.semanticKind,
    confidence: clampConfidence(winner.confidence),
    matchedRules: Object.freeze([winner.ruleId]),
    alternativeCandidates: Object.freeze([...alternatives]),
    provenance: Object.freeze({
      graphNodeId: graphNode.id,
      layoutLineIndices: graphNode.provenance.layoutLineIndices,
      sourceText: graphNode.provenance.sourceText,
      rawText: graphNode.provenance.rawText,
      graphCreationRule: graphNode.provenance.creationRule,
      classificationRules: Object.freeze([winner.ruleId]),
      confidence: clampConfidence(winner.confidence),
    }),
    amount: graphNode.amount ?? null,
  });
}

export function classifyNode(
  graphNode: GraphNode,
  ctx: GraphContext
): ClassifiedNode {
  const candidates: ClassificationCandidate[] = [];
  for (const classifier of CLASSIFIERS) {
    candidates.push(...classifier(graphNode, ctx));
  }

  if (candidates.length === 0) {
    candidates.push(fallbackCandidate(graphNode));
  }

  const { winner, alternatives } = resolveConflict(candidates);
  return buildClassifiedNode(graphNode, winner, alternatives);
}

export function classifyAllNodes(ctx: GraphContext): ClassifiedNode[] {
  return ctx.graph.nodes.map((node) => classifyNode(node, ctx));
}

export function averageConfidence(nodes: readonly ClassifiedNode[]): number {
  if (nodes.length === 0) return CONFIDENCE.none;
  return nodes.reduce((sum, node) => sum + node.confidence, 0) / nodes.length;
}

export { CLASSIFIERS };
