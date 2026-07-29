import type { GraphNode } from "../types/models/graph";
import type { GraphIndex, GraphRegion } from "./graphIndex";

export interface RowViewProvenance {
  readonly layoutLineIndices: readonly number[];
  readonly rawTexts: readonly string[];
  readonly graphNodeIds: readonly string[];
}

export interface RowView {
  readonly rawLineId: string;
  readonly region: GraphRegion | null;
  readonly rawLineNode: GraphNode;
  readonly nameFragmentId: string | null;
  readonly amountNodeIds: readonly string[];
  readonly tokenNodeIds: readonly string[];
  readonly boundAmountNodeIds: readonly string[];
  readonly allNodeIds: readonly string[];
  readonly provenance: RowViewProvenance;
}

function uniqueSorted(indices: number[]): readonly number[] {
  return Object.freeze(Array.from(new Set(indices)).sort((a, b) => a - b));
}

export function buildRowView(index: GraphIndex, rawLineId: string): RowView | null {
  const rawLineNode = index.node(rawLineId);
  if (!rawLineNode || rawLineNode.kind !== "raw_line") return null;

  const amountNodeIds = index.amountNodeIdsOnRow(rawLineId);
  const tokenNodeIds = index.tokenNodeIdsOnRow(rawLineId);
  const boundAmountNodeIds = index.amountsBoundTo(rawLineId);
  const allNodeIds = Object.freeze(
    Array.from(
      new Set([...index.rowNodeIds(rawLineId), ...boundAmountNodeIds])
    )
  );

  const layoutLineIndices = uniqueSorted(
    allNodeIds.flatMap(
      (id) => [...(index.node(id)?.provenance.layoutLineIndices ?? [])]
    )
  );

  const rawTexts = Object.freeze(
    Array.from(
      new Set(
        allNodeIds
          .map((id) => index.node(id)?.provenance.rawText ?? "")
          .filter(Boolean)
      )
    )
  );

  return Object.freeze({
    rawLineId,
    region: index.regionOfRaw(rawLineId),
    rawLineNode,
    nameFragmentId: index.nameFragmentId(rawLineId),
    amountNodeIds,
    tokenNodeIds,
    boundAmountNodeIds,
    allNodeIds,
    provenance: Object.freeze({
      layoutLineIndices,
      rawTexts,
      graphNodeIds: allNodeIds,
    }),
  });
}

export function buildAllRowViews(index: GraphIndex): readonly RowView[] {
  return Object.freeze(
    index
      .rawLineIds()
      .map((rawId) => buildRowView(index, rawId))
      .filter((row): row is RowView => row != null)
  );
}
