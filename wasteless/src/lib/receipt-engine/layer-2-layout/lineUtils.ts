import { parseMoney } from "@/lib/money";
import { MONEY_ONLY, MONEY_TAIL, VAT_STANDALONE, X_TOTAL } from "./patterns";
import { HAS_LETTERS } from "../patterns/neutral";

export function normalizeOcrLine(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractTrailingAmount(line: string): {
  text: string;
  amount: number | null;
  amountRaw: string | null;
} {
  const m = line.match(MONEY_TAIL);
  if (!m || m.index == null) {
    return { text: line, amount: null, amountRaw: null };
  }
  const amount = parseMoney(m[1]);
  if (amount == null || amount <= 0) {
    return { text: line, amount: null, amountRaw: null };
  }
  return {
    text: line.slice(0, m.index).trim(),
    amount,
    amountRaw: m[1]!,
  };
}

const STAR_MONEY_ONLY =
  /^\*\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+[,.]\d{2})\s*(?:tl|₺)?$/i;

export function isAmountOnlyLine(line: string): boolean {
  const t = line.trim();
  if (MONEY_ONLY.test(t)) return true;
  if (STAR_MONEY_ONLY.test(t)) return true;
  if (X_TOTAL.test(t)) return true;
  if (isSplitProductAmountLine(line)) return true;
  return false;
}

/** VAT + star-amount on its own row, e.g. "%1 *195,00" — price belongs to previous product name. */
export function isSplitProductAmountLine(line: string): boolean {
  const t = line.trim();
  if (!/%\s*\d{1,2}/.test(t)) return false;
  if (!/[*×x]\s*\d/.test(t) && !MONEY_TAIL.test(t)) return false;
  const withoutMoney = t.replace(MONEY_TAIL, "").replace(/[*×x]\s*$/, "").trim();
  const namePart = withoutMoney.replace(VAT_STANDALONE, "").replace(/%/g, "").trim();
  if (namePart && HAS_LETTERS.test(namePart) && namePart.length > 2) return false;
  return true;
}

export function leadingWhitespaceRatio(raw: string): number {
  const m = raw.match(/^(\s+)/);
  if (!m) return 0;
  return m[1]!.length / Math.max(raw.length, 1);
}
