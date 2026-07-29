import type {
  GraphEdge,
  GraphNode,
  ReceiptGraph,
} from "../types/models/graph";

export interface GraphDebugNodeView {
  id: string;
  kind: GraphNode["kind"];
  text: string;
  amount: number | null;
  lineIndex: number;
  layoutLineIndices: number[];
  creationRule: string;
  confidence: number;
  rawText: string;
}

export interface GraphDebugEdgeView {
  id: string;
  kind: GraphEdge["kind"];
  from: string;
  to: string;
  confidence: number;
}

export interface GraphDebugView {
  summary: {
    profileId: string;
    nodeCount: number;
    edgeCount: number;
    confidence: number;
    regions: ReceiptGraph["regions"];
  };
  nodes: GraphDebugNodeView[];
  edges: GraphDebugEdgeView[];
}

export function serializeGraphForDebug(graph: ReceiptGraph): GraphDebugView {
  return {
    summary: {
      profileId: graph.profileId,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      confidence: graph.confidence,
      regions: graph.regions,
    },
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      text: node.text,
      amount: node.amount ?? null,
      lineIndex: node.layoutRef.lineIndex,
      layoutLineIndices: [...node.provenance.layoutLineIndices],
      creationRule: node.provenance.creationRule,
      confidence: node.confidence,
      rawText: node.provenance.rawText,
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      kind: edge.kind,
      from: edge.from,
      to: edge.to,
      confidence: edge.confidence,
    })),
  };
}

export function formatGraphDebug(graph: ReceiptGraph): string {
  const view = serializeGraphForDebug(graph);
  const lines: string[] = [
    `ReceiptGraph profile=${view.summary.profileId} nodes=${view.summary.nodeCount} edges=${view.summary.edgeCount}`,
    `confidence=${view.summary.confidence.toFixed(2)}`,
    "",
    "regions:",
    `  header: ${(view.summary.regions.header ?? []).join(", ") || "(none)"}`,
    `  body:   ${(view.summary.regions.body ?? []).join(", ") || "(none)"}`,
    `  footer: ${(view.summary.regions.footer ?? []).join(", ") || "(none)"}`,
    "",
    "nodes:",
  ];

  for (const node of view.nodes) {
    lines.push(
      `  [${node.kind}] ${node.id} L${node.lineIndex} "${node.text}" rule=${node.creationRule} conf=${node.confidence.toFixed(2)}`
    );
  }

  lines.push("", "edges:");
  for (const edge of view.edges) {
    lines.push(
      `  ${edge.from} --${edge.kind}--> ${edge.to} conf=${edge.confidence.toFixed(2)}`
    );
  }

  return lines.join("\n");
}

export function graphToJson(graph: ReceiptGraph): string {
  return JSON.stringify(
    {
      profileId: graph.profileId,
      confidence: graph.confidence,
      regions: graph.regions,
      nodes: graph.nodes,
      edges: graph.edges,
    },
    null,
    2
  );
}
