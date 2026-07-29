import type { LayoutDocument, LayoutLine } from "../../types/models/layout";
import type { GraphBuilderState } from "../graphImmutable";
import { withEdges, withNodes } from "../graphImmutable";
import { amountId, nameFragmentId, rawLineId } from "../graphIds";
import { createNode, sameRowEdge } from "../graphNodes";

function nameNodeKind(line: LayoutLine): "label" | "text_fragment" {
  return line.region === "footer" ? "label" : "text_fragment";
}

export function passColumns(
  state: GraphBuilderState,
  layout: LayoutDocument
): GraphBuilderState {
  let next = state;
  const nodes = [];
  const edges = [];

  for (const line of layout.lines) {
    const rawId = rawLineId(line.index);
    const nameText = line.columns?.name?.trim();

    if (nameText) {
      nodes.push(
        createNode(
          nameFragmentId(line.index),
          nameNodeKind(line),
          nameText,
          line,
          "passColumns:name"
        )
      );
      edges.push(sameRowEdge(nameFragmentId(line.index), rawId, line.confidence));
    }

    const amountText = line.columns?.amount?.trim();
    if (amountText) {
      nodes.push(
        createNode(
          amountId(line.index),
          "amount",
          amountText,
          line,
          "passColumns:amount",
          line.trailingAmount ?? null
        )
      );
      edges.push(sameRowEdge(amountId(line.index), rawId, line.confidence));
    }
  }

  next = withNodes(next, nodes);
  return withEdges(next, edges);
}
