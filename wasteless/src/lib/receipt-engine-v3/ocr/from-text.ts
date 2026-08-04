import type { RawLine, RawLineDocument } from "../types/raw-line";

/** Stage 1 — OCR output as raw lines only. */
export function rawLinesFromText(
  rawText: string,
  confidence = 0.85
): RawLineDocument {
  const parts = rawText.replace(/\r\n/g, "\n").split("\n");
  const lines: RawLine[] = [];
  for (let i = 0; i < parts.length; i++) {
    const text = parts[i]?.trim() ?? "";
    if (!text) continue;
    lines.push({
      index: i,
      text,
      confidence,
      page: 1,
    });
  }
  return { lines, rawText };
}

export function rawLinesFromOcrDocument(ocr: {
  rawText: string;
  lines?: readonly string[];
  lineDetails?: readonly { text: string; confidence?: number }[];
}): RawLineDocument {
  if (ocr.lineDetails?.length) {
    const lines = ocr.lineDetails.map((d, index) => ({
      index,
      text: d.text.trim(),
      confidence: d.confidence ?? 0.85,
      page: 1,
    })).filter((l) => l.text);
    return { lines, rawText: ocr.rawText };
  }
  if (ocr.lines?.length) {
    const lines = ocr.lines.map((text, index) => ({
      index,
      text: text.trim(),
      confidence: 0.85,
      page: 1,
    })).filter((l) => l.text);
    return { lines, rawText: ocr.rawText };
  }
  return rawLinesFromText(ocr.rawText);
}
