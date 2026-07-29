import type { ReceiptGraph } from "../types/models/graph";
import type { ClassifiedGraph } from "../types/models/classify";
import { clampConfidence } from "../types/provenance";
import {
  averageConfidence,
  classifyAllNodes,
} from "./classifierOrchestrator";
import { GraphContext } from "./graphContext";

export function buildClassifiedGraph(graph: ReceiptGraph): ClassifiedGraph {
  const ctx = new GraphContext(graph);
  const nodes = classifyAllNodes(ctx);

  return Object.freeze({
    graph,
    nodes: Object.freeze(nodes),
    confidence: clampConfidence(averageConfidence(nodes)),
  });
}
