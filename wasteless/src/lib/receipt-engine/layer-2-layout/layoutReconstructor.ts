import type { OcrDocument } from "../types/models/image";
import type { LayoutDocument, LayoutLine } from "../types/models/layout";
import { clampConfidence, CONFIDENCE } from "../types/provenance";
import { detectColumns } from "./columnDetector";
import { markContinuations } from "./continuationDetector";
import { extractFeatures, extractVatToken } from "./featureExtractor";
import { normalizeOcrLine } from "./lineUtils";
import { resolveReadingOrder } from "./readingOrderResolver";
import { BARCODE_NOISE, SEPARATOR_NOISE } from "./patterns";
import { segmentDocument } from "../document-segmentation/segmentDocument";
import type { DocumentSection } from "../document-segmentation/types";

function lineConfidence(
  hasColumns: boolean,
  hasAmount: boolean,
  isNoise: boolean
): number {
  if (isNoise) return CONFIDENCE.low;
  if (hasColumns && hasAmount) return CONFIDENCE.high;
  if (hasColumns || hasAmount) return CONFIDENCE.medium;
  return CONFIDENCE.low;
}

function buildLayoutLine(
  index: number,
  rawLine: string,
  region: LayoutLine["region"],
  section: DocumentSection,
  isContinuation: boolean
): LayoutLine {
  const normalized = normalizeOcrLine(rawLine);
  const split = detectColumns(normalized);
  const vat = extractVatToken(normalized);
  const features = extractFeatures(
    rawLine,
    normalized,
    split.trailingAmount != null
  );
  features.isLikelyContinuation = isContinuation;
  if (vat.vatToken) features.vatToken = vat.vatToken;

  const isNoise =
    !normalized ||
    normalized.length < 2 ||
    BARCODE_NOISE.test(normalized.replace(/\s/g, "")) ||
    SEPARATOR_NOISE.test(normalized);

  const columns = { ...split.columns };
  if (vat.vatToken && !columns.vat) columns.vat = vat.vatToken;
  if (features.quantityToken && !columns.name) {
    columns.name = normalized;
  }

  const hasColumnData = Boolean(columns.name || columns.vat || columns.amount);

  return {
    index,
    text: normalized,
    rawText: rawLine,
    region,
    section,
    columns: hasColumnData ? columns : undefined,
    trailingAmount: split.trailingAmount,
    features: {
      hasVatToken: features.hasVatToken,
      hasWeightPattern: features.hasWeightPattern,
      hasQuantityToken: features.hasQuantityToken,
      isAmountOnly: features.isAmountOnly,
      isLikelyContinuation: features.isLikelyContinuation,
      isRightAlignedPrice: features.isRightAlignedPrice,
    },
    tokens: {
      quantity: features.quantityToken ?? undefined,
      vat: features.vatToken ?? undefined,
    },
    confidence: clampConfidence(
      lineConfidence(hasColumnData, split.trailingAmount != null, isNoise)
    ),
  };
}

/**
 * Layout reconstruction + document segmentation.
 *
 * Pipeline: OCR lines → segment (state machine) → columns/features → LayoutDocument.
 * Product parsers must only consume `section === "PRODUCTS"` (coarse region `body`).
 */
export function reconstructLayout(
  ocr: OcrDocument,
  profileId: string
): LayoutDocument {
  const rawLines = ocr.lines.length
    ? ocr.lines
    : ocr.rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  const normalizedLines = rawLines.map(normalizeOcrLine).filter(Boolean);
  const segmentation = segmentDocument(normalizedLines);
  const regions = segmentation.lines.map((l) => l.region);
  const sections = segmentation.lines.map((l) => l.section);

  const trailingAmounts = normalizedLines.map(
    (line) => detectColumns(line).trailingAmount
  );
  const continuations = markContinuations(
    normalizedLines,
    regions,
    trailingAmounts
  );

  const lines = normalizedLines.map((line, index) =>
    buildLayoutLine(
      index,
      rawLines[index] ?? line,
      regions[index]!,
      sections[index]!,
      continuations[index]!
    )
  );

  const header: number[] = [];
  const body: number[] = [];
  const footer: number[] = [];
  lines.forEach((l) => {
    if (l.region === "header") header.push(l.index);
    else if (l.region === "footer") footer.push(l.index);
    else body.push(l.index);
  });

  const avgConfidence =
    lines.length > 0
      ? lines.reduce((sum, l) => sum + l.confidence, 0) / lines.length
      : CONFIDENCE.none;

  return {
    lines,
    profileId,
    readingOrder: resolveReadingOrder(lines.length),
    regions: { header, body, footer },
    sections: segmentation.sections,
    productsEndIndex: segmentation.productsEndIndex,
    confidence: clampConfidence(avgConfidence),
  };
}
