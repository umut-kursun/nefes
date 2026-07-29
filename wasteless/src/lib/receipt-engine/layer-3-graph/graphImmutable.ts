import type {
  GraphEdge,
  GraphNode,
  ReceiptGraph,
  ReceiptGraphRegions,
} from "../types/models/graph";
import type { Confidence } from "../types/provenance";
import { clampConfidence } from "../types/provenance";

export interface GraphBuilderState {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly regions: ReceiptGraphRegions;
  readonly profileId: string;
  readonly confidence: Confidence;
}

export function initGraphState(
  profileId: string,
  confidence: Confidence
): GraphBuilderState {
  return {
    nodes: [],
    edges: [],
    regions: {},
    profileId,
    confidence: clampConfidence(confidence),
  };
}

export function withNodes(
  state: GraphBuilderState,
  nodes: readonly GraphNode[]
): GraphBuilderState {
  return { ...state, nodes: Object.freeze([...state.nodes, ...nodes]) };
}

export function withEdges(
  state: GraphBuilderState,
  edges: readonly GraphEdge[]
): GraphBuilderState {
  return { ...state, edges: Object.freeze([...state.edges, ...edges]) };
}

export function withRegions(
  state: GraphBuilderState,
  regions: ReceiptGraphRegions
): GraphBuilderState {
  return { ...state, regions: Object.freeze({ ...regions }) };
}

export function nodeById(
  state: GraphBuilderState,
  id: string
): GraphNode | undefined {
  return state.nodes.find((node) => node.id === id);
}

export function hasNode(state: GraphBuilderState, id: string): boolean {
  return state.nodes.some((node) => node.id === id);
}

export function hasEdge(
  state: GraphBuilderState,
  from: string,
  to: string,
  kind: GraphEdge["kind"]
): boolean {
  return state.edges.some(
    (edge) => edge.from === from && edge.to === to && edge.kind === kind
  );
}

export function finalizeGraph(state: GraphBuilderState): ReceiptGraph {
  const avgConfidence =
    state.nodes.length > 0
      ? state.nodes.reduce((sum, node) => sum + node.confidence, 0) /
        state.nodes.length
      : state.confidence;

  return Object.freeze({
    nodes: Object.freeze([...state.nodes]),
    edges: Object.freeze([...state.edges]),
    regions: Object.freeze({ ...state.regions }),
    profileId: state.profileId,
    confidence: clampConfidence(avgConfidence),
  });
}

export function addEdge(
  state: GraphBuilderState,
  from: string,
  to: string,
  kind: GraphEdge["kind"],
  confidence: Confidence
): GraphBuilderState {
  if (hasEdge(state, from, to, kind)) return state;
  const edge: GraphEdge = Object.freeze({
    id: `edge:${kind}:${from}->${to}`,
    from,
    to,
    kind,
    confidence: clampConfidence(confidence),
  });
  return withEdges(state, [edge]);
}
