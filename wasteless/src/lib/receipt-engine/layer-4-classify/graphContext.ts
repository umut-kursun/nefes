import type { GraphEdge, GraphNode } from "../types/models/graph";
import { buildGraphIndex, type GraphIndex, type GraphRegion } from "../graph/graphIndex";

export type { GraphRegion };

export class GraphContext {
  private readonly index: GraphIndex;

  constructor(readonly graph: GraphIndex["graph"]) {
    this.index = buildGraphIndex(graph);
  }

  get indexView(): GraphIndex {
    return this.index;
  }

  node(id: string): GraphNode | undefined {
    return this.index.node(id);
  }

  edgesFrom(id: string): readonly GraphEdge[] {
    return this.index.edgesFrom(id);
  }

  edgesTo(id: string): readonly GraphEdge[] {
    return this.index.edgesTo(id);
  }

  rawLineId(node: GraphNode): string | null {
    return this.index.rawLineIdForNode(node.id);
  }

  regionOfRaw(rawId: string): GraphRegion | null {
    return this.index.regionOfRaw(rawId);
  }

  regionOfNode(node: GraphNode): GraphRegion | null {
    const rawId = this.rawLineId(node);
    return rawId ? this.regionOfRaw(rawId) : null;
  }

  nameFragment(rawId: string): GraphNode | undefined {
    const fragmentId = this.index.nameFragmentId(rawId);
    return fragmentId ? this.index.node(fragmentId) : undefined;
  }

  nameText(rawId: string): string {
    return this.nameFragment(rawId)?.text ?? "";
  }

  rawLineText(rawId: string): string {
    return this.index.node(rawId)?.text ?? "";
  }

  combinedRowText(rawId: string): string {
    const fragment = this.nameText(rawId);
    const raw = this.rawLineText(rawId);
    return fragment || raw;
  }

  hasSameRowAmount(rawId: string): boolean {
    return this.index.amountNodeIdsOnRow(rawId).length > 0;
  }

  hasBoundAmount(rawId: string): boolean {
    return this.index.amountsBoundTo(rawId).length > 0;
  }

  hasUnitPriceToken(rawId: string): boolean {
    return this.index.tokenNodeIdsOnRow(rawId).some(
      (id) => this.index.node(id)?.kind === "unit_price_token"
    );
  }

  hasIncomingContinuation(rawId: string): boolean {
    return this.index.continuationPredecessors(rawId).length > 0;
  }

  hasOutgoingContinuation(rawId: string): boolean {
    return this.index.continuationSuccessors(rawId).length > 0;
  }

  amountOfTarget(amountNodeId: string): string | null {
    return this.index.amountBindingTarget(amountNodeId);
  }

  firstHeaderRawId(): string | null {
    return this.index.firstHeaderRawId();
  }

  isFirstHeaderLine(node: GraphNode): boolean {
    const rawId = this.rawLineId(node);
    if (!rawId) return false;
    return rawId === this.firstHeaderRawId();
  }
}
