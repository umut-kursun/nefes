import type { GraphIndex } from "./graphIndex";
import { buildRowView, type RowView, type RowViewProvenance } from "./rowView";

export interface ChainViewProvenance extends RowViewProvenance {
  readonly headRawLineId: string;
}

export interface ChainView {
  readonly headRawLineId: string;
  readonly rawLineIds: readonly string[];
  readonly rows: readonly RowView[];
  readonly boundAmountNodeIds: readonly string[];
  readonly allNodeIds: readonly string[];
  readonly provenance: ChainViewProvenance;
}

export function buildChainView(
  index: GraphIndex,
  headRawLineId: string
): ChainView | null {
  const members = index.chainMembers(headRawLineId);
  const rows = members
    .map((rawId) => buildRowView(index, rawId))
    .filter((row): row is RowView => row != null);

  if (rows.length === 0) return null;

  const boundAmountNodeIds = Object.freeze(
    members.flatMap((rawId) => [...index.amountsBoundTo(rawId)])
  );

  const allNodeIds = Object.freeze(
    Array.from(
      new Set([
        ...rows.flatMap((row) => [...row.allNodeIds]),
        ...boundAmountNodeIds,
      ])
    )
  );

  const layoutLineIndices = Object.freeze(
    Array.from(
      new Set(
        allNodeIds.flatMap(
          (id) => [...(index.node(id)?.provenance.layoutLineIndices ?? [])]
        )
      )
    ).sort((a, b) => a - b)
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
    headRawLineId,
    rawLineIds: Object.freeze([...members]),
    rows: Object.freeze(rows),
    boundAmountNodeIds,
    allNodeIds,
    provenance: Object.freeze({
      headRawLineId,
      layoutLineIndices,
      rawTexts,
      graphNodeIds: allNodeIds,
    }),
  });
}

export function buildAllChainViews(index: GraphIndex): readonly ChainView[] {
  return Object.freeze(
    index
      .chainHeads()
      .map((headId) => buildChainView(index, headId))
      .filter((chain): chain is ChainView => chain != null)
  );
}
