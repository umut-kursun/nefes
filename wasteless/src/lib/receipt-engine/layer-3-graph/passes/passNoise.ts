import type { LayoutLine } from "../../types/models/layout";
import type { GraphBuilderState } from "../graphImmutable";
import { withEdges, withNodes } from "../graphImmutable";
import { noiseId, rawLineId } from "../graphIds";
import { createNode, sameRowEdge } from "../graphNodes";

function isNoiseLine(line: LayoutLine): boolean {
  const compact = line.text.replace(/\s/g, "");
  if (/^\d{8,}$/.test(compact)) return true;
  if (/^\*+$/.test(line.text.trim())) return true;
  return false;
}

export function passNoise(
  state: GraphBuilderState,
  layout: { lines: LayoutLine[] }
): GraphBuilderState {
  const nodes = [];
  const edges = [];

  for (const line of layout.lines) {
    if (!isNoiseLine(line)) continue;

    const rawId = rawLineId(line.index);
    nodes.push(
      createNode(
        noiseId(line.index),
        "noise",
        line.text,
        line,
        "passNoise:barcode_or_separator"
      )
    );
    edges.push(sameRowEdge(noiseId(line.index), rawId, line.confidence));
  }

  const next = withEdges(withNodes(state, nodes), edges);
  return next;
}
