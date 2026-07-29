import type { LayoutLineFeatures } from "../types/models/layout";
import {
  VAT_INLINE,
  VAT_STANDALONE,
  WEIGHTED_PATTERN,
} from "./patterns";
import { isAmountOnlyLine, leadingWhitespaceRatio } from "./lineUtils";
import { purchasedQuantityToken } from "../layer-6-purchase/parsers/purchasedQuantity";

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
  const purchased = purchasedQuantityToken(normalizedLine);
  const amountOnly = isAmountOnlyLine(normalizedLine);
  const rightAligned =
    hasTrailingAmount &&
    (leadingWhitespaceRatio(rawLine) > 0.15 || amountOnly);

  return {
    hasVatToken:
      VAT_INLINE.test(normalizedLine) || VAT_STANDALONE.test(normalizedLine),
    hasWeightPattern: weighted != null,
    hasQuantityToken: purchased != null,
    isAmountOnly: amountOnly,
    isLikelyContinuation: false,
    isRightAlignedPrice: rightAligned,
    // Only explicit purchased / sold-weight qty — never package attributes.
    quantityToken: purchased,
    vatToken: null,
  };
}
