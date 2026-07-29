import type { LayoutDocument, LayoutLine } from "../../types/models/layout";
import type { GraphBuilderState } from "../graphImmutable";
import { addEdge } from "../graphImmutable";
import { amountId, rawLineId } from "../graphIds";

function findAmountBindLine(
  lines: LayoutLine[],
  amountLineIndex: number
): LayoutLine {
  for (let i = amountLineIndex - 1; i >= 0; i--) {
    const candidate = lines[i]!;
    if (candidate.features.isLikelyContinuation) return candidate;
    if (candidate.columns?.name && !candidate.features.isAmountOnly) {
      return candidate;
    }
    if (!candidate.features.isAmountOnly) return candidate;
  }
  return lines[amountLineIndex]!;
}

export function passAmountBinding(
  state: GraphBuilderState,
  layout: LayoutDocument
): GraphBuilderState {
  let next = state;

  for (const line of layout.lines) {
    if (!line.columns?.amount) continue;

    const amountNodeId = amountId(line.index);
    const bindLine = line.features.isAmountOnly
      ? findAmountBindLine(layout.lines, line.index)
      : line;

    next = addEdge(
      next,
      amountNodeId,
      rawLineId(bindLine.index),
      "amount_of",
      line.confidence
    );
  }

  return next;
}
