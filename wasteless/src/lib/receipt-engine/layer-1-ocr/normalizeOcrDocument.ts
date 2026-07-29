import type {
  OcrDocument,
  OcrLineDetail,
  OcrSource,
} from "../types/models/image";
import type { OcrExtractLine, OcrExtractOutput } from "./providers/ocrProvider";
import { clampConfidence, CONFIDENCE } from "../types/provenance";

export function normalizeUnicode(text: string): string {
  return text.normalize("NFKC");
}

export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function normalizeCurrencySymbols(text: string): string {
  return text.replace(/₺\s*/g, "");
}

export function collapseInlineSpaces(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n");
}

export function normalizeOcrLineText(text: string): string {
  return collapseInlineSpaces(
    normalizeCurrencySymbols(normalizeUnicode(text))
  );
}

function normalizeExtractLine(line: OcrExtractLine): OcrLineDetail {
  const text = normalizeOcrLineText(line.text);
  const base: OcrLineDetail = { text };
  const withConf =
    line.confidence !== undefined
      ? { ...base, confidence: clampConfidence(line.confidence) }
      : base;
  if (line.bbox) {
    return { ...withConf, bbox: Object.freeze({ ...line.bbox }) };
  }
  return withConf;
}

function computeQualityScore(
  lines: readonly OcrLineDetail[],
  documentConfidence?: number
): number {
  const confidences = lines
    .map((l) => l.confidence)
    .filter((c): c is number => c !== undefined);

  if (confidences.length > 0) {
    return clampConfidence(
      confidences.reduce((a, b) => a + b, 0) / confidences.length
    );
  }
  if (documentConfidence !== undefined) {
    return clampConfidence(documentConfidence);
  }
  if (lines.length === 0) return CONFIDENCE.none;
  return clampConfidence(Math.min(1, lines.length / 10));
}

export function normalizeOcrExtractOutput(
  output: OcrExtractOutput
): OcrDocument {
  return normalizeOcrRawPayload({
    rawText: output.rawText,
    lines: output.lines,
    source: output.source,
    documentConfidence: output.documentConfidence,
  });
}

export function normalizeOcrRawPayload(payload: {
  rawText: string;
  lines?: readonly OcrExtractLine[];
  source: OcrSource;
  documentConfidence?: number;
}): OcrDocument {
  const rawText = collapseInlineSpaces(
    normalizeCurrencySymbols(
      normalizeLineEndings(normalizeUnicode(payload.rawText))
    )
  );

  const lineDetails: OcrLineDetail[] = payload.lines?.length
    ? payload.lines.map(normalizeExtractLine).filter((l) => l.text.length > 0)
    : rawText
        .split("\n")
        .map((line) => normalizeOcrLineText(line))
        .filter(Boolean)
        .map((text) => ({ text }));

  const lines = Object.freeze(lineDetails.map((l) => l.text));

  return Object.freeze({
    rawText: lines.join("\n"),
    lines,
    lineDetails: Object.freeze(lineDetails),
    source: payload.source,
    quality: Object.freeze({
      charCount: rawText.length,
      lineCount: lines.length,
      score: computeQualityScore(lineDetails, payload.documentConfidence),
    }),
  });
}

/** @deprecated Use normalizeOcrRawPayload — kept for fixture helpers. */
export function ocrDocumentFromRaw(rawText: string): OcrDocument {
  return normalizeOcrRawPayload({
    rawText,
    source: "mock",
    documentConfidence: 0.85,
  });
}
