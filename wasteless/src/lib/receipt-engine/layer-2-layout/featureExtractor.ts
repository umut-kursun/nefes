import type { LayoutLineFeatures } from "../types/models/layout";
import {
  QTY_X_EMBED,
  VAT_INLINE,
  VAT_STANDALONE,
  WEIGHTED_PATTERN,
} from "./patterns";
import { PURCHASED_QTY_EXPLICIT } from "../patterns/document";
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
  const purchasedQty = normalizedLine.match(PURCHASED_QTY_EXPLICIT);
  const qtyX = normalizedLine.match(QTY_X_EMBED);
  const amountOnly = isAmountOnlyLine(normalizedLine);
  const rightAligned =
    hasTrailingAmount &&
    (leadingWhitespaceRatio(rawLine) > 0.15 || amountOnly);

  let quantityToken: string | null = null;
  if (weighted?.[1] && weighted?.[2]) {
    quantityToken = `${weighted[1]} ${weighted[2]}`.trim();
  } else if (purchasedQty?.[0]) {
    quantityToken = purchasedQty[0].trim();
  } else if (qtyX?.[0]) {
    quantityToken = qtyX[0].trim();
  }

  return {
    hasVatToken: VAT_INLINE.test(normalizedLine) || VAT_STANDALONE.test(normalizedLine),
    hasWeightPattern: weighted != null,
    hasQuantityToken: quantityToken != null,
    isAmountOnly: amountOnly,
    isLikelyContinuation: false,
    isRightAlignedPrice: rightAligned,
    quantityToken,
    vatToken: null,
  };
}
