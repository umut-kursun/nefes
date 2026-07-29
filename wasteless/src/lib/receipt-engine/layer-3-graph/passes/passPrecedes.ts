import type { LayoutDocument } from "../../types/models/layout";
import type { GraphBuilderState } from "../graphImmutable";
import { addEdge } from "../graphImmutable";
import { rawLineId } from "../graphIds";

export function passPrecedes(
  state: GraphBuilderState,
  layout: LayoutDocument
): GraphBuilderState {
  let next = state;
  const order =
    layout.readingOrder.length > 0
      ? layout.readingOrder
      : layout.lines.map((line) => line.index);

  for (let i = 0; i < order.length - 1; i++) {
    const from = rawLineId(order[i]!);
    const to = rawLineId(order[i + 1]!);
    const line = layout.lines[order[i + 1]!];
    next = addEdge(next, from, to, "precedes", line?.confidence ?? 0.65);
  }

  return next;
}
