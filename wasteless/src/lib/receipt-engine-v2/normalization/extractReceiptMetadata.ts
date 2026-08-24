import { parseDate } from "@/lib/receipt-engine/layer-6-purchase/parsers/dateParser";
import { parseTime } from "@/lib/receipt-engine/layer-6-purchase/parsers/timeParser";
import type { ParsedField } from "@/lib/receipt-engine/types/models/purchase";
import { DATE_ONLY_LINE } from "../extraction/linePatterns";

export type ExtractedReceiptMetadata = {
  readonly purchaseDate: ParsedField<string> | null;
  readonly purchaseTime: ParsedField<string> | null;
  readonly receiptNumber: ParsedField<string> | null;
  readonly currency: ParsedField<string> | null;
};

const DATE_LABEL = /(?:TAR[İI]H|DATE)\s*[:.]?\s*(.+)$/i;
const TIME_LABEL = /(?:SAAT|TIME)\s*[:.]?\s*(.+)$/i;
const RECEIPT_NO =
  /(?:F[İI][ŞS]\s*NO|FIS\s*NO|FATURA\s*NO|SIRA\s*NO)\s*[:.]?\s*(.+)$/i;
const BARE_TIME_LINE = /^\s*\d{1,2}:\d{2}(?::\d{2})?\s*$/;
const COMBINED_DATETIME =
  /^(\d{2}[./-]\d{2}[./-]\d{4})\s+(\d{1,2}[.:]\d{2}(?::\d{2})?)\b/;

function fieldFromParsed(parsed: ParsedField<string> | undefined): ParsedField<string> | null {
  if (!parsed?.raw?.trim()) return null;
  if (parsed.normalized) {
    return Object.freeze({ raw: parsed.raw, normalized: parsed.normalized });
  }
  return Object.freeze({ raw: parsed.raw });
}

function parseDateCandidate(raw: string): ParsedField<string> | null {
  const parsed = parseDate(raw.trim());
  return fieldFromParsed(parsed);
}

function parseTimeCandidate(raw: string): ParsedField<string> | null {
  const parsed = parseTime(raw.trim());
  return fieldFromParsed(parsed);
}

/** Deterministic date/time/receipt metadata from OCR lines (raw OCR unchanged). */
export function extractReceiptMetadataFromLines(
  lines: readonly string[]
): ExtractedReceiptMetadata {
  let purchaseDate: ParsedField<string> | null = null;
  let purchaseTime: ParsedField<string> | null = null;
  let receiptNumber: ParsedField<string> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const combined = trimmed.match(COMBINED_DATETIME);
    if (combined) {
      if (!purchaseDate) {
        purchaseDate = parseDateCandidate(combined[1]!);
      }
      if (!purchaseTime) {
        purchaseTime = parseTimeCandidate(combined[2]!);
      }
      continue;
    }

    if (DATE_ONLY_LINE.test(trimmed)) {
      const dateToken = trimmed.match(/^(\d{2}[./-]\d{2}[./-]\d{4})/);
      if (dateToken?.[1] && !purchaseDate) {
        purchaseDate = parseDateCandidate(dateToken[1]);
      }
      const inlineTime = trimmed.match(
        /\d{2}[./-]\d{2}[./-]\d{4}\s+(\d{1,2}[.:]\d{2}(?::\d{2})?)/
      );
      if (inlineTime?.[1] && !purchaseTime) {
        purchaseTime = parseTimeCandidate(inlineTime[1]);
      }
      continue;
    }

    if (BARE_TIME_LINE.test(trimmed) && !purchaseTime) {
      purchaseTime = parseTimeCandidate(trimmed);
      continue;
    }

    const dateMatch = trimmed.match(DATE_LABEL);
    if (dateMatch?.[1] && !purchaseDate) {
      purchaseDate = parseDateCandidate(dateMatch[1]);
      continue;
    }

    const timeMatch = trimmed.match(TIME_LABEL);
    if (timeMatch?.[1] && !purchaseTime) {
      const token = timeMatch[1].trim();
      if (/^\d{1,2}[.:]\d{2}/.test(token)) {
        purchaseTime = parseTimeCandidate(token);
      } else if (!receiptNumber && token.length <= 32) {
        receiptNumber = Object.freeze({ raw: token, normalized: token });
      }
      continue;
    }

    const receiptMatch = trimmed.match(RECEIPT_NO);
    if (receiptMatch?.[1] && !receiptNumber) {
      const token = receiptMatch[1].trim();
      receiptNumber = Object.freeze({ raw: token, normalized: token });
    }
  }

  return {
    purchaseDate,
    purchaseTime,
    receiptNumber,
    currency: Object.freeze({ raw: "TRY", normalized: "TRY" }),
  };
}

export function mergeMetadataFields(
  fromLines: ExtractedReceiptMetadata,
  vision: {
    purchaseDate?: string | null;
    purchaseTime?: string | null;
    receiptNumber?: string | null;
    currency?: string | null;
  }
): ExtractedReceiptMetadata {
  const visionDate = vision.purchaseDate
    ? parseDateCandidate(vision.purchaseDate)
    : null;
  const visionTime = vision.purchaseTime
    ? parseTimeCandidate(vision.purchaseTime)
    : null;

  return {
    purchaseDate: fromLines.purchaseDate?.normalized
      ? fromLines.purchaseDate
      : visionDate?.normalized
        ? visionDate
        : fromLines.purchaseDate ?? visionDate,
    purchaseTime: fromLines.purchaseTime?.normalized
      ? fromLines.purchaseTime
      : visionTime?.normalized
        ? visionTime
        : fromLines.purchaseTime ?? visionTime,
    receiptNumber:
      fromLines.receiptNumber ??
      (vision.receiptNumber?.trim()
        ? Object.freeze({
            raw: vision.receiptNumber.trim(),
            normalized: vision.receiptNumber.trim(),
          })
        : null),
    currency: Object.freeze({
      raw: vision.currency?.trim() || "TRY",
      normalized: vision.currency?.trim() || "TRY",
    }),
  };
}
