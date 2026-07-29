import type { LayoutDocument } from "../../types/models/layout";
import type { GraphBuilderState } from "../graphImmutable";
import { addEdge } from "../graphImmutable";
import { rawLineId } from "../graphIds";

export function passFooterOf(
  state: GraphBuilderState,
  layout: LayoutDocument
): GraphBuilderState {
  let next = state;
  const footerIndices = layout.regions.footer;

  for (let i = 1; i < footerIndices.length; i++) {
    const prevIndex = footerIndices[i - 1]!;
    const currIndex = footerIndices[i]!;
    const line = layout.lines[currIndex];
    if (!line) continue;

    next = addEdge(
      next,
      rawLineId(currIndex),
      rawLineId(prevIndex),
      "footer_of",
      line.confidence
    );
  }

  return next;
}
