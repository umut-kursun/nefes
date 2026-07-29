import type {
  GraphEdge,
  GraphEdgeKind,
  GraphNode,
  GraphNodeKind,
} from "../types/models/graph";
import type { LayoutLine } from "../types/models/layout";
import { clampConfidence } from "../types/provenance";
import { edgeId } from "./graphIds";

export function createNode(
  id: string,
  kind: GraphNodeKind,
  text: string,
  line: LayoutLine,
  creationRule: string,
  amount?: number | null,
  extraLineIndices?: number[]
): GraphNode {
  const layoutLineIndices = extraLineIndices ?? [line.index];
  const confidence = clampConfidence(line.confidence);

  return Object.freeze({
    id,
    kind,
    text,
    amount: amount ?? null,
    layoutRef: Object.freeze({ lineIndex: line.index }),
    provenance: Object.freeze({
      layoutLineIndices: Object.freeze([...layoutLineIndices]),
      sourceText: text,
      rawText: line.rawText,
      creationRule,
      confidence,
    }),
    confidence,
  });
}

export function createEdge(
  from: string,
  to: string,
  kind: GraphEdgeKind,
  confidence: number
): GraphEdge {
  return Object.freeze({
    id: edgeId(kind, from, to),
    from,
    to,
    kind,
    confidence: clampConfidence(confidence),
  });
}

export function sameRowEdge(
  childId: string,
  rawId: string,
  confidence: number
): GraphEdge {
  return createEdge(childId, rawId, "same_row", confidence);
}

export function relationEdge(
  from: string,
  to: string,
  kind: GraphEdgeKind,
  confidence: number
): GraphEdge {
  return createEdge(from, to, kind, confidence);
}
