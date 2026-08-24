import type { VisionMetadata, VisionMerchant, VisionResult } from "./types";

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function parseMerchant(raw: unknown): VisionMerchant | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const m = raw as Record<string, unknown>;
  const rawName = asNullableString(m.rawName ?? m.name ?? m.title);
  const rawAddress = asNullableString(m.rawAddress ?? m.address);
  const rawTaxNumber = asNullableString(
    m.rawTaxNumber ?? m.vknTckn ?? m.taxNumber ?? m.vkn
  );

  if (rawName == null && rawAddress == null && rawTaxNumber == null) {
    return undefined;
  }

  return {
    rawName,
    ...(rawAddress != null ? { rawAddress } : {}),
    ...(rawTaxNumber != null ? { rawTaxNumber } : {}),
  };
}

function parseMetadata(raw: unknown): VisionMetadata | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const m = raw as Record<string, unknown>;
  const receiptNumber = asNullableString(m.receiptNumber);
  const purchaseDate = asNullableString(m.purchaseDate);
  const purchaseTime = asNullableString(m.purchaseTime);
  let currency = asNullableString(m.currency);
  if (currency?.toUpperCase() === "TL") currency = "TRY";

  if (
    receiptNumber == null &&
    purchaseDate == null &&
    purchaseTime == null &&
    currency == null
  ) {
    return undefined;
  }

  return {
    ...(receiptNumber != null ? { receiptNumber } : {}),
    ...(purchaseDate != null ? { purchaseDate } : {}),
    ...(purchaseTime != null ? { purchaseTime } : {}),
    ...(currency != null ? { currency } : {}),
  };
}

function splitRawText(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function parseConfidence(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(1, Math.max(0, value));
}

function parseLines(raw: unknown, rawText: string): readonly string[] {
  if (Array.isArray(raw)) {
    const lines = raw
      .map((line) => (line == null ? "" : String(line).trimEnd()))
      .filter((line) => line.length > 0);
    if (lines.length > 0) return lines;
  }
  return splitRawText(rawText);
}

/**
 * Normalize arbitrary model JSON into a strict VisionResult.
 * Ignores product/discount/payment fields if the model returns them.
 */
export function parseVisionResult(raw: unknown): VisionResult {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const rawText = obj.rawText == null ? "" : String(obj.rawText);
  const merchant = parseMerchant(obj.merchant);
  const metadata = parseMetadata(obj.metadata);
  const lines = parseLines(obj.lines, rawText);
  const confidence = parseConfidence(obj.confidence);

  const result: VisionResult = {
    rawText,
    lines: lines.length > 0 ? lines : splitRawText(rawText),
  };

  if (merchant) {
    return confidence != null
      ? { ...result, merchant, metadata, confidence }
      : metadata
        ? { ...result, merchant, metadata }
        : { ...result, merchant };
  }

  if (metadata) {
    return confidence != null
      ? { ...result, metadata, confidence }
      : { ...result, metadata };
  }

  return confidence != null ? { ...result, confidence } : result;
}

export function extractJsonFromModelContent(content: string): unknown {
  const trimmed = content.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence?.[1]?.trim() ?? trimmed;
  return JSON.parse(body);
}
