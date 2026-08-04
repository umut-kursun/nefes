import { parseMoney } from "@/lib/money";
import { MONEY_TAIL, normalizeTrMatch } from "./neutral";

/** Star-prefixed ÖKC amounts: "*625,00", "**1.219,00" */
export const STAR_AMOUNT_SUFFIX =
  /\*+\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+[,.]\d{2})\s*(?:tl|₺)?\s*$/i;

/** Extract monetary amount embedded in a payment/product label line. */
export function extractInlineAmount(label: string): number | null {
  const t = label.trim();
  if (!t) return null;
  const star = t.match(STAR_AMOUNT_SUFFIX);
  if (star?.[1]) {
    const parsed = parseMoney(star[1]);
    if (parsed != null) return parsed;
  }
  const tail = t.match(MONEY_TAIL);
  if (tail?.[1]) {
    const parsed = parseMoney(tail[1]);
    if (parsed != null) return parsed;
  }
  return null;
}

/** Remove trailing star-amounts and money tails from footer labels. */
export function stripAmountFromLabel(label: string): string {
  return label
    .replace(STAR_AMOUNT_SUFFIX, "")
    .replace(MONEY_TAIL, "")
    .replace(/\s*\*+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Strip ÖKC VAT tokens and star noise from product names at parse time. */
export function stripProductNameDecorations(name: string): string {
  let s = name.trim();
  if (!s) return s;
  s = s.replace(/^\*+\s*/g, "");
  s = s.replace(/\s+%\s*\d{1,2}(?:[.,]\d+)?\s*$/g, "");
  s = s.replace(/\s*\*+\s*$/g, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

const BANK_ISSUER_ONLY =
  /^(yapi\s*kredi|yapikredi|ziraat\s*bank|ziraatbank|is\s*bank|isbank|garanti\s*bbva|garanti|akbank|halkbank|vakifbank|qnb|finansbank|denizbank|teb|kuveytturk|ing\s*bank)$/i;

/** POS acquirer line without amount — not a separate payment row. */
export function isBankIssuerOnlyLine(label: string): boolean {
  const stripped = stripAmountFromLabel(label);
  const compact = normalizeTrMatch(stripped).replace(/\s/g, "");
  if (!compact || /\d/.test(compact)) return false;
  return BANK_ISSUER_ONLY.test(compact);
}
