import {
  parseReceiptNumber,
  pickBestReceiptNumberText,
} from "@/lib/receipt-engine/layer-6-purchase/parsers/receiptNumberParser";

/** Post-Vision fallback: extract FİŞ NO / FIS NO from raw OCR text. */
export function extractReceiptNumberFromRawText(
  rawText: string
): string | null {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const bestLine = pickBestReceiptNumberText(lines);
  if (!bestLine) return null;

  const parsed = parseReceiptNumber(bestLine);
  return parsed.normalized ?? null;
}
