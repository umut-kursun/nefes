import type { GraphEdge, GraphEdgeKind, GraphNode, ReceiptGraph } from "../types/models/graph";
import type { LineSemanticType, ReceiptSectionKind } from "../types/models/sections";

export type GraphRegion = "header" | "body" | "footer";

export class GraphIndex {
  private readonly nodeMap: Map<string, GraphNode>;
  private readonly edgesFromMap: Map<string, GraphEdge[]>;
  private readonly edgesToMap: Map<string, GraphEdge[]>;
  private readonly rawIds: string[];
  private readonly rowChildrenMap: Map<string, string[]>;
  private readonly amountBoundToMap: Map<string, string[]>;
  private readonly amountTargetMap: Map<string, string>;
  private readonly continuesNextMap: Map<string, string[]>;
  private readonly continuesPrevMap: Map<string, string[]>;

  constructor(readonly graph: ReceiptGraph) {
    this.nodeMap = new Map();
    this.edgesFromMap = new Map();
    this.edgesToMap = new Map();
    this.rowChildrenMap = new Map();
    this.amountBoundToMap = new Map();
    this.amountTargetMap = new Map();
    this.continuesNextMap = new Map();
    this.continuesPrevMap = new Map();

    for (const node of graph.nodes) {
      this.nodeMap.set(node.id, node);
    }

    for (const edge of graph.edges) {
      this.pushEdge(this.edgesFromMap, edge.from, edge);
      this.pushEdge(this.edgesToMap, edge.to, edge);

      if (edge.kind === "same_row") {
        this.pushId(this.rowChildrenMap, edge.to, edge.from);
      }
      if (edge.kind === "amount_of") {
        this.pushId(this.amountBoundToMap, edge.to, edge.from);
        this.amountTargetMap.set(edge.from, edge.to);
      }
      if (edge.kind === "continues") {
        this.pushId(this.continuesNextMap, edge.from, edge.to);
        this.pushId(this.continuesPrevMap, edge.to, edge.from);
      }
    }

    this.rawIds = graph.nodes
      .filter((node) => node.kind === "raw_line")
      .map((node) => node.id)
      .sort(
        (a, b) =>
          (this.node(a)?.layoutRef.lineIndex ?? 0) -
          (this.node(b)?.layoutRef.lineIndex ?? 0)
      );
  }

  private pushEdge(map: Map<string, GraphEdge[]>, key: string, edge: GraphEdge) {
    const list = map.get(key) ?? [];
    list.push(edge);
    map.set(key, list);
  }

  private pushId(map: Map<string, string[]>, key: string, id: string) {
    const list = map.get(key) ?? [];
    list.push(id);
    map.set(key, list);
  }

  node(id: string): GraphNode | undefined {
    return this.nodeMap.get(id);
  }

  rawLineIds(): readonly string[] {
    return this.rawIds;
  }

  edgesFrom(id: string, kind?: GraphEdgeKind): readonly GraphEdge[] {
    const edges = this.edgesFromMap.get(id) ?? [];
    return kind ? edges.filter((edge) => edge.kind === kind) : edges;
  }

  edgesTo(id: string, kind?: GraphEdgeKind): readonly GraphEdge[] {
    const edges = this.edgesToMap.get(id) ?? [];
    return kind ? edges.filter((edge) => edge.kind === kind) : edges;
  }

  regionOfRaw(rawId: string): GraphRegion | null {
    if (this.graph.regions.header?.includes(rawId)) return "header";
    if (this.graph.regions.body?.includes(rawId)) return "body";
    if (this.graph.regions.footer?.includes(rawId)) return "footer";
    return null;
  }

  rowNodeIds(rawId: string): readonly string[] {
    const children = this.rowChildrenMap.get(rawId) ?? [];
    return Object.freeze([rawId, ...children]);
  }

  continuationSuccessors(rawId: string): readonly string[] {
    return Object.freeze([...(this.continuesNextMap.get(rawId) ?? [])]);
  }

  continuationPredecessors(rawId: string): readonly string[] {
    return Object.freeze([...(this.continuesPrevMap.get(rawId) ?? [])]);
  }

  chainHeads(): readonly string[] {
    return Object.freeze(
      this.rawIds.filter(
        (rawId) => (this.continuesPrevMap.get(rawId) ?? []).length === 0
      )
    );
  }

  chainMembers(headRawId: string): readonly string[] {
    const members: string[] = [headRawId];
    let current = headRawId;
    while (true) {
      const next = this.continuationSuccessors(current);
      if (next.length === 0) break;
      const sorted = [...next].sort(
        (a, b) =>
          (this.node(a)?.layoutRef.lineIndex ?? 0) -
          (this.node(b)?.layoutRef.lineIndex ?? 0)
      );
      const pick = sorted[0]!;
      members.push(pick);
      current = pick;
    }
    return Object.freeze(members);
  }

  amountsBoundTo(rawId: string): readonly string[] {
    return Object.freeze([...(this.amountBoundToMap.get(rawId) ?? [])]);
  }

  amountBindingTarget(amountNodeId: string): string | null {
    return this.amountTargetMap.get(amountNodeId) ?? null;
  }

  rawLineIdForNode(nodeId: string): string | null {
    const node = this.node(nodeId);
    if (!node) return null;
    if (node.kind === "raw_line") return node.id;
    const sameRow = this.edgesFrom(nodeId, "same_row")[0];
    return sameRow?.to ?? null;
  }

  nameFragmentId(rawId: string): string | null {
    for (const childId of this.rowChildrenMap.get(rawId) ?? []) {
      const child = this.node(childId);
      if (child?.kind === "text_fragment" || child?.kind === "label") {
        return childId;
      }
    }
    return null;
  }

  amountNodeIdsOnRow(rawId: string): readonly string[] {
    return Object.freeze(
      (this.rowChildrenMap.get(rawId) ?? []).filter(
        (id) => this.node(id)?.kind === "amount"
      )
    );
  }

  tokenNodeIdsOnRow(rawId: string): readonly string[] {
    return Object.freeze(
      (this.rowChildrenMap.get(rawId) ?? []).filter((id) => {
        const kind = this.node(id)?.kind;
        return (
          kind === "vat_token" ||
          kind === "quantity_token" ||
          kind === "unit_price_token"
        );
      })
    );
  }

  firstHeaderRawId(): string | null {
    const header = this.graph.regions.header ?? [];
    if (header.length === 0) return null;
    return header.reduce((min, id) => {
      const minIndex = this.node(min)?.layoutRef.lineIndex ?? Infinity;
      const idIndex = this.node(id)?.layoutRef.lineIndex ?? Infinity;
      return idIndex < minIndex ? id : min;
    });
  }

  sectionOfRaw(rawId: string): ReceiptSectionKind | null {
    const meta = this.node(rawId)?.meta as
      | { sectionKind?: ReceiptSectionKind }
      | undefined;
    return meta?.sectionKind ?? null;
  }

  lineSemanticTypeOfRaw(rawId: string): LineSemanticType | null {
    const meta = this.node(rawId)?.meta as
      | { lineSemanticType?: LineSemanticType }
      | undefined;
    return meta?.lineSemanticType ?? null;
  }

  headerLinesForMerchant(): Array<{
    index: number;
    text: string;
    lineSemanticType: LineSemanticType;
  }> {
    return (this.graph.regions.header ?? []).map((rawId) => {
      const node = this.node(rawId);
      const meta = node?.meta as { lineSemanticType?: LineSemanticType } | undefined;
      return {
        index: node?.layoutRef.lineIndex ?? 0,
        text: node?.text ?? "",
        lineSemanticType: meta?.lineSemanticType ?? "UnknownLine",
      };
    });
  }
}

export function buildGraphIndex(graph: ReceiptGraph): GraphIndex {
  return new GraphIndex(graph);
}
