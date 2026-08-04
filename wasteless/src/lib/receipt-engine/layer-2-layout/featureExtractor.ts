import type { LayoutLineFeatures } from "../types/models/layout";
import {
  isValidTrVatRate,
  isVatOcrQuantityMatch,
  QTY_X_EMBED,
  VAT_INLINE,
  VAT_OCR_X,
  VAT_STANDALONE,
  WEIGHTED_PATTERN,
} from "../patterns/neutral";
import { PURCHASED_QTY_EXPLICIT, isFuelLine } from "../patterns/document";
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
  let working = line;

  const ocrVat = working.match(VAT_OCR_X);
  if (ocrVat?.[1] && isValidTrVatRate(Number(ocrVat[1]))) {
    vatToken = `%${ocrVat[1]}`;
    working = working.replace(ocrVat[0], " ");
  }

  const stripped = working.replace(VAT_INLINE, (match) => {
    vatToken = match.trim();
    return " ";
  });
  if (VAT_STANDALONE.test(line.trim())) {
    vatToken = line.trim();
    return { text: "", vatToken };
  }
  return { text: stripped.replace(/\s+/g, " ").trim(), vatToken };
}

const PACK_SIZE_UNITS = new Set(["g", "gr", "gram", "ml", "lt", "l", "litre"]);

function isScaleQuantity(qtyRaw: string, unit: string): boolean {
  if (unit === "kg") return true;
  if (/,\d{3}\b/.test(qtyRaw)) return true;
  if (qtyRaw.includes(",") && /,\d{1,2}\b/.test(qtyRaw)) return true;
  return false;
}

function isPackSizeWeightedMatch(
  normalizedLine: string,
  weighted: RegExpMatchArray
): boolean {
  const unit = weighted[2]?.toLowerCase() ?? "";
  const qtyRaw = weighted[1] ?? "";
  if (isFuelLine(normalizedLine)) return false;
  if (isScaleQuantity(qtyRaw, unit)) return false;
  if (PACK_SIZE_UNITS.has(unit)) {
    const qty = Number(qtyRaw.replace(",", "."));
    if (Number.isFinite(qty) && qty < 1000) return true;
  }
  const priceNum = Number(String(weighted[3]).replace(",", "."));
  if (isValidTrVatRate(priceNum) && /[xX×]\s*\d/.test(weighted[0])) return true;
  if (VAT_OCR_X.test(normalizedLine)) return true;
  return false;
}

export function extractFeatures(
  rawLine: string,
  normalizedLine: string,
  hasTrailingAmount: boolean
): ExtractedFeatures {
  const vatExtract = extractVatToken(normalizedLine);
  const lineForQty = vatExtract.text || normalizedLine;

  const weighted = lineForQty.match(WEIGHTED_PATTERN);
  const purchasedQty = lineForQty.match(PURCHASED_QTY_EXPLICIT);
  const qtyX = lineForQty.match(QTY_X_EMBED);
  const amountOnly = isAmountOnlyLine(normalizedLine);
  const rightAligned =
    hasTrailingAmount &&
    (leadingWhitespaceRatio(rawLine) > 0.15 || amountOnly);

  let quantityToken: string | null = null;
  if (weighted?.[1] && weighted?.[2] && !isPackSizeWeightedMatch(normalizedLine, weighted)) {
    quantityToken = `${weighted[1]} ${weighted[2]}`.trim();
  } else if (purchasedQty?.[0] && !isVatOcrQuantityMatch(purchasedQty[0])) {
    quantityToken = purchasedQty[0].trim();
  } else if (qtyX?.[0] && !isVatOcrQuantityMatch(qtyX[0])) {
    quantityToken = qtyX[0].trim();
  }

  return {
    hasVatToken:
      vatExtract.vatToken != null ||
      VAT_INLINE.test(normalizedLine) ||
      VAT_STANDALONE.test(normalizedLine),
    hasWeightPattern: weighted != null && !isPackSizeWeightedMatch(normalizedLine, weighted),
    hasQuantityToken: quantityToken != null,
    isAmountOnly: amountOnly,
    isLikelyContinuation: false,
    isRightAlignedPrice: rightAligned,
    quantityToken,
    vatToken: vatExtract.vatToken,
  };
}
