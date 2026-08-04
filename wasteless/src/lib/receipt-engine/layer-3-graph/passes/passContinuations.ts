import type { LayoutDocument } from "../../types/models/layout";
import { isAddressLikeLine, isFuelLine, TOPKDV_HINT } from "../../patterns/document";
import {
  HAS_LETTERS,
  matchesDate,
  matchesReceiptNumber,
  matchesTime,
} from "../../patterns/neutral";
import { isSplitProductAmountLine } from "../../layer-2-layout/lineUtils";
import type { GraphBuilderState } from "../graphImmutable";
import { addEdge } from "../graphImmutable";
import { rawLineId } from "../graphIds";

const FUEL_NAME = /motor[iİI]n|benzin|dizel|lpg|euro|akaryak[iİI]t/i;
const FUEL_VAT_STAR = /^[xX×]\s*\d{1,2}\s*\*/;

function allowFuelContinuation(prevText: string, lineText: string): boolean {
  if (isFuelLine(prevText) && HAS_LETTERS.test(lineText) && !isFuelLine(lineText)) {
    return true;
  }
  if (FUEL_NAME.test(prevText) && FUEL_VAT_STAR.test(lineText.trim())) {
    return true;
  }
  return false;
}

export function passContinuations(
  state: GraphBuilderState,
  layout: LayoutDocument
): GraphBuilderState {
  let next = state;

  for (const line of layout.lines) {
    if (!line.features.isLikelyContinuation || line.index === 0) continue;

    const prev = layout.lines[line.index - 1];
    if (!prev) continue;
    if (prev.region !== line.region) continue;
    if (TOPKDV_HINT.test(line.text) || TOPKDV_HINT.test(prev.text)) continue;
    if (
      !allowFuelContinuation(prev.text, line.text) &&
      (isFuelLine(line.text) || isFuelLine(prev.text))
    ) {
      continue;
    }
    if (prev.trailingAmount != null && isSplitProductAmountLine(prev.text)) continue;
    if (
      isAddressLikeLine(prev.text) ||
      isAddressLikeLine(line.text) ||
      matchesDate(prev.text) ||
      matchesDate(line.text) ||
      matchesTime(prev.text) ||
      matchesTime(line.text) ||
      matchesReceiptNumber(prev.text) ||
      matchesReceiptNumber(line.text)
    ) {
      continue;
    }

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
