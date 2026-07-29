import type { LayoutLineColumns } from "../types/models/layout";
import { extractTrailingAmount } from "./lineUtils";
import { extractVatToken } from "./featureExtractor";

export interface ColumnSplit {
  columns: LayoutLineColumns;
  nameText: string;
  trailingAmount: number | null;
}

export function detectColumns(rawLine: string): ColumnSplit {
  const normalized = rawLine.replace(/\u00a0/g, " ").trim();
  const { text: afterMoney, amount } = extractTrailingAmount(normalized);
  const vat = extractVatToken(afterMoney);

  const columns: LayoutLineColumns = {};
  if (vat.vatToken) columns.vat = vat.vatToken;
  if (amount != null) {
    columns.amount = normalized.match(/(\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{2})|\d+[,.]\d{2})\s*(?:tl|₺)?$/i)?.[1] ?? String(amount);
  }
  const nameText = vat.text.trim();
  if (nameText) columns.name = nameText;

  return {
    columns,
    nameText,
    trailingAmount: amount,
  };
}
