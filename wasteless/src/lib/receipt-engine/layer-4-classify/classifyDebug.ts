import type { ClassifiedGraph } from "../types/models/classify";
import type { GraphNode } from "../types/models/graph";

export interface ClassificationInspection {
  graphNode: GraphNode;
  semanticKind: string;
  matchedRules: readonly string[];
  alternativeCandidates: ClassifiedGraph["nodes"][number]["alternativeCandidates"];
  confidence: number;
  provenance: ClassifiedGraph["nodes"][number]["provenance"];
}

export function inspectClassification(
  classified: ClassifiedGraph,
  nodeId: string
): ClassificationInspection | null {
  const classifiedNode = classified.nodes.find((node) => node.id === nodeId);
  const graphNode = classified.graph.nodes.find((node) => node.id === nodeId);
  if (!classifiedNode || !graphNode) return null;

  return {
    graphNode,
    semanticKind: classifiedNode.semanticKind,
    matchedRules: classifiedNode.matchedRules,
    alternativeCandidates: classifiedNode.alternativeCandidates,
    confidence: classifiedNode.confidence,
    provenance: classifiedNode.provenance,
  };
}

export function formatClassificationDebug(classified: ClassifiedGraph): string {
  const lines = [
    `ClassifiedGraph nodes=${classified.nodes.length} confidence=${classified.confidence.toFixed(2)}`,
    "",
  ];

  for (const node of classified.nodes) {
    const alts =
      node.alternativeCandidates.length > 0
        ? ` alts=${node.alternativeCandidates.map((a) => a.semanticKind).join("|")}`
        : "";
    lines.push(
      `  [${node.semanticKind}] ${node.id} rule=${node.matchedRules.join(",")} conf=${node.confidence.toFixed(2)}${alts}`
    );
  }

  return lines.join("\n");
}

export function classifiedGraphToJson(classified: ClassifiedGraph): string {
  return JSON.stringify(
    {
      confidence: classified.confidence,
      nodes: classified.nodes,
    },
    null,
    2
  );
}
