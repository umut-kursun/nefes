import type { LayoutDocument, LayoutLine } from "../../types/models/layout";
import type { GraphBuilderState } from "../graphImmutable";
import { addEdge } from "../graphImmutable";
import { amountId, rawLineId } from "../graphIds";
import {
  matchesSubtotal,
  matchesTotal,
  matchesVatLabel,
} from "../../patterns/neutral";

function isFooterLabelLine(line: LayoutLine): boolean {
  const t = line.text.trim();
  return matchesVatLabel(t) || matchesTotal(t) || matchesSubtotal(t);
}

/** Stacked footer: KDV / TOPLAM labels then *amount lines on separate rows. */
function findStackedFooterBindLine(
  lines: LayoutLine[],
  amountLineIndex: number
): LayoutLine | null {
  let amountPos = 0;
  for (let i = amountLineIndex; i >= 0; i--) {
    if (lines[i]?.features.isAmountOnly) amountPos++;
    else break;
  }
  amountPos = Math.max(0, amountPos - 1);

  const labels: LayoutLine[] = [];
  for (let i = amountLineIndex - amountPos - 1; i >= 0; i--) {
    const candidate = lines[i]!;
    if (candidate.features.isAmountOnly) continue;
    if (isFooterLabelLine(candidate)) {
      labels.unshift(candidate);
      continue;
    }
    break;
  }

  if (labels.length === 0) return null;
  return labels[Math.min(amountPos, labels.length - 1)]!;
}

function findAmountBindLine(
  lines: LayoutLine[],
  amountLineIndex: number
): LayoutLine {
  const stacked = findStackedFooterBindLine(lines, amountLineIndex);
  if (stacked) return stacked;

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
