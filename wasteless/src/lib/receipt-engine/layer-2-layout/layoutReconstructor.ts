import type { OcrDocument } from "../types/models/image";
import type { LayoutDocument, LayoutLine } from "../types/models/layout";
import { clampConfidence, CONFIDENCE } from "../types/provenance";
import { detectColumns } from "./columnDetector";
import { markContinuations } from "./continuationDetector";
import {
  assignRegions,
  buildRegionIndices,
  detectFooterStart,
  detectHeaderEnd,
  findBodyStart,
} from "./footerDetector";
import { extractFeatures, extractVatToken } from "./featureExtractor";
import { normalizeOcrLine } from "./lineUtils";
import { resolveReadingOrder } from "./readingOrderResolver";
import { segmentDocument } from "./sectionDetector";
import { BARCODE_NOISE, SEPARATOR_NOISE } from "./patterns";

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
  sectionKind: LayoutLine["sectionKind"],
  lineSemanticType: LayoutLine["lineSemanticType"],
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

  const tokens: LayoutLine["tokens"] = {};
  if (features.quantityToken) tokens.quantity = features.quantityToken;
  if (features.vatToken) tokens.vat = features.vatToken;

  return {
    index,
    text: normalized,
    rawText: rawLine,
    region,
    sectionKind,
    lineSemanticType,
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
    tokens: Object.keys(tokens).length > 0 ? tokens : {},
    confidence: clampConfidence(
      lineConfidence(hasColumnData, split.trailingAmount != null, isNoise)
    ),
  };
}

export function reconstructLayout(
  ocr: OcrDocument,
  profileId: string
): LayoutDocument {
  const rawLines = ocr.lines.length
    ? ocr.lines
    : ocr.rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  const normalizedLines = rawLines.map(normalizeOcrLine).filter(Boolean);
  const bodyStart = findBodyStart(normalizedLines);
  const footerStart = detectFooterStart(normalizedLines);
  const headerEnd = detectHeaderEnd(normalizedLines, bodyStart);
  const regions = assignRegions(normalizedLines, footerStart, headerEnd);

  const trailingAmounts = normalizedLines.map(
    (line) => detectColumns(line).trailingAmount
  );
  const continuations = markContinuations(
    normalizedLines,
    regions,
    trailingAmounts
  );

  const segmentation = segmentDocument(normalizedLines, regions);

  const lines = normalizedLines.map((line, index) =>
    buildLayoutLine(
      index,
      rawLines[index] ?? line,
      regions[index]!,
      segmentation.sectionByLineIndex[index] ?? "footer",
      segmentation.lineTypes[index] ?? "UnknownLine",
      continuations[index]!
    )
  );

  const regionMap = buildRegionIndices(regions);
  const avgConfidence =
    lines.length > 0
      ? lines.reduce((sum, l) => sum + l.confidence, 0) / lines.length
      : CONFIDENCE.none;

  return {
    lines,
    profileId,
    readingOrder: resolveReadingOrder(lines.length),
    regions: regionMap,
    segmentation,
    confidence: clampConfidence(avgConfidence),
  };
}
