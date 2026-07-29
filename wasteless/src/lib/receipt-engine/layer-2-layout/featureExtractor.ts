import type { LayoutLineFeatures } from "../types/models/layout";
import {
  QTY_TOKEN,
  QTY_X_EMBED,
  VAT_INLINE,
  VAT_STANDALONE,
  WEIGHTED_PATTERN,
} from "./patterns";
import { isAmountOnlyLine, leadingWhitespaceRatio } from "./lineUtils";

export interface ExtractedFeatures extends LayoutLineFeatures {
  quantityToken: string | null;
  vatToken: string | null;
}

export function extractVatToken(line: string): {
  text: string;
  vatToken: string | null;
} {
  let vatToken: string | null = null;
  const stripped = line.replace(VAT_INLINE, (match) => {
    vatToken = match.trim();
    return " ";
  });
  if (VAT_STANDALONE.test(line.trim())) {
    vatToken = line.trim();
    return { text: "", vatToken };
  }
  return { text: stripped.replace(/\s+/g, " ").trim(), vatToken };
}

export function extractFeatures(
  rawLine: string,
  normalizedLine: string,
  hasTrailingAmount: boolean
): ExtractedFeatures {
  const weighted = normalizedLine.match(WEIGHTED_PATTERN);
  const qty = normalizedLine.match(QTY_TOKEN);
  const qtyX = normalizedLine.match(QTY_X_EMBED);
  const amountOnly = isAmountOnlyLine(normalizedLine);
  const rightAligned =
    hasTrailingAmount &&
    (leadingWhitespaceRatio(rawLine) > 0.15 || amountOnly);

  return {
    hasVatToken: VAT_INLINE.test(normalizedLine) || VAT_STANDALONE.test(normalizedLine),
    hasWeightPattern: weighted != null,
    hasQuantityToken: qty != null || qtyX != null,
    isAmountOnly: amountOnly,
    isLikelyContinuation: false,
    isRightAlignedPrice: rightAligned,
    quantityToken: qty?.[0]?.trim() ?? qtyX?.[0]?.trim() ?? null,
    vatToken: null,
  };
}
