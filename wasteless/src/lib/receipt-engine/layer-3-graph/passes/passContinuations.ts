import type { LayoutDocument } from "../../types/models/layout";
import type { GraphBuilderState } from "../graphImmutable";
import { addEdge } from "../graphImmutable";
import { rawLineId } from "../graphIds";

export function passContinuations(
  state: GraphBuilderState,
  layout: LayoutDocument
): GraphBuilderState {
  let next = state;

  for (const line of layout.lines) {
    if (!line.features.isLikelyContinuation || line.index === 0) continue;

    const prev = layout.lines[line.index - 1];
    if (!prev) continue;

    next = addEdge(
      next,
      rawLineId(prev.index),
      rawLineId(line.index),
      "continues",
      line.confidence
    );
  }

  return next;
}
