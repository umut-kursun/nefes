import type { LayoutDocument } from "../../types/models/layout";
import type { GraphBuilderState } from "../graphImmutable";
import { withNodes } from "../graphImmutable";
import { rawLineId } from "../graphIds";
import { createNode } from "../graphNodes";

export function passRawLines(
  state: GraphBuilderState,
  layout: LayoutDocument
): GraphBuilderState {
  const nodes = layout.lines.map((line) =>
    createNode(
      rawLineId(line.index),
      "raw_line",
      line.rawText,
      line,
      "passRawLines"
    )
  );
  return withNodes(state, nodes);
}
