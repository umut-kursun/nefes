import type { MetadataBlock } from "../types/models/blocks";
import type { ParsedField } from "../types/models/purchase";
import {
  parseCurrency,
  parseDate,
  parseReceiptNumber,
  parseTime,
} from "./parsers";

export interface MappedMetadata {
  merchant: string | null;
  purchaseDate: ParsedField<string> | null;
  purchaseTime: ParsedField<string> | null;
  receiptNumber: ParsedField<string> | null;
  currency: ParsedField<string> | null;
}

export function mapMetadataBlock(metadata: MetadataBlock): MappedMetadata {
  return Object.freeze({
    merchant: metadata.merchant,
    purchaseDate: metadata.date ? parseDate(metadata.date) : null,
    purchaseTime: metadata.time ? parseTime(metadata.time) : null,
    receiptNumber: metadata.receiptNumber
      ? parseReceiptNumber(metadata.receiptNumber)
      : null,
    currency: findCurrency(metadata),
  });
}

function findCurrency(metadata: MetadataBlock): ParsedField<string> | null {
  const texts = [
    metadata.merchant,
    metadata.date,
    metadata.time,
    metadata.receiptNumber,
    metadata.loyalty,
    ...metadata.barcodes,
  ].filter((t): t is string => Boolean(t));

  for (const text of texts) {
    const parsed = parseCurrency(text);
    if (parsed) return parsed;
  }
  return null;
}
