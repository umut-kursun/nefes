import { parseMoney } from "@/lib/money";
import { MONEY_ONLY, MONEY_TAIL, X_TOTAL } from "./patterns";

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

export function isAmountOnlyLine(line: string): boolean {
  const t = line.trim();
  if (MONEY_ONLY.test(t)) return true;
  if (X_TOTAL.test(t)) return true;
  return false;
}

export function leadingWhitespaceRatio(raw: string): number {
  const m = raw.match(/^(\s+)/);
  if (!m) return 0;
  return m[1]!.length / Math.max(raw.length, 1);
}
