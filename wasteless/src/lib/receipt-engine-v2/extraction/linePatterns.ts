import { parseTurkishAmount } from "../core/parseTurkishAmount";
import {
  parseAmountFromOcrLine,
  repairOcrAmountToken,
  stripOcrControlChars,
} from "./ocrParseNormalize";

const STAR_AMOUNT = /\*(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:[.,]\d+)?)/g;

function parseStarToken(raw: string, token: string): number | null {
  const cleaned = stripOcrControlChars(token);
  const repaired = repairOcrAmountToken(raw, cleaned) ?? cleaned;
  return parseTurkishAmount(repaired) ?? parseTurkishAmount(cleaned);
}

export function extractStarAmounts(raw: string): number[] {
  const normalized = stripOcrControlChars(raw);
  const amounts: number[] = [];
  for (const match of normalized.matchAll(STAR_AMOUNT)) {
    const parsed = parseStarToken(raw, match[1] ?? match[0]);
    if (parsed != null) amounts.push(parsed);
  }
  return amounts;
}

export function lastStarAmount(raw: string): number | null {
  const amounts = extractStarAmounts(raw);
  return amounts.length > 0 ? amounts[amounts.length - 1]! : null;
}

/** Star-prefixed or trailing Turkish amount at end of line. */
export function extractTrailingAmount(raw: string): number | null {
  const fromOcr = parseAmountFromOcrLine(raw);
  if (fromOcr != null) return fromOcr;

  const star = lastStarAmount(raw);
  if (star != null) return star;
  const match = stripOcrControlChars(raw).match(
    /(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2})\s*(?:TL)?\s*$/i
  );
  if (!match?.[1]) return null;
  return Number(match[1].replace(/\./g, "").replace(",", "."));
}

export function extractInlineVatRate(raw: string): number | null {
  const match = raw.match(/%\s*(\d+(?:[.,]\d+)?)/);
  if (!match?.[1]) return null;
  const rate = parseTurkishAmount(match[1].replace(",", "."));
  return rate;
}

export const VAT_LABEL =
  /^\s*(?:TOP\s*KDV|TOPKDV|TOPLAM\s*KDV|KDV\s*TUTARI|KDV)\b/i;

export const TOTAL_LABEL =
  /^\s*(?:TOPLAM(?:\s*TUTAR)?|GENEL\s*TOPLAM|ÖDENECEK(?:\s*TUTAR)?|ODENECEK(?:\s*TUTAR)?)\b/i;

export const SUBTOTAL_LABEL = /^\s*ARA\s+TOPLAM\b/i;

export const DISCOUNT_SECTION = /(?:[İI]ND[İI]R[İI]MLER|[İI]ND[İI]R[İI]M\s*TOPLAM)/i;

export const PAYMENT_METHOD =
  /(?:^|\b)(?:NAK[İI]T|KRED[İI](?:\s*KART[İI]?)?|BANKA\s*\/\s*KRED[İI]|BANKA\/KRED[İI]\s*KART|ORTAK\s*POS|DEB[İI]T|VISA|MASTERCARD|K\.?\s*KARTI)\b|^(?:NAK[İI]T|KRED[İI])\s*$/i;

export const CARD_METADATA =
  /(?:^\*{4,}|AID:|POS\s*NO|İŞYERİ|ISYERI|BATCH|STAN|ONAY\s*KOD|İŞLEM\s*NO|ISLEM\s*NO|MERSIS|MERS[İI]S|T\.?\s*S[İI]C[İI]L|EKÜ|Z\s*NO|SIPARI[ŞS]|SİPARİ[ŞS])/i;

export const BANK_NAME_ONLY =
  /^(?:İŞ\s*BANKASI|IS\s*BANKASI|T\.?\s*VAKIFLAR|AKBANK|GARANT[İI]|Z[İI]RAAT|YAPI\s*KRED[İI]|HALK\s*BANK)/i;

export const HEADER_METADATA =
  /(?:TAR[İI]H|SAAT|F[İI][ŞS]\s*NO|FATURA\s*NO|SIRA\s*NO|TCKN|VKN|VERG[İI]|VD\.|MERS[İI]S|ADRES|MAH\.|CAD\.|\bCD\b|A\.[ŞS]\.|LTD|T[İI]CARET)/i;

export const DATE_ONLY_LINE =
  /^\s*\d{2}[./-]\d{2}[./-]\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?\s*$/;

export const FUEL_QTY_LINE =
  /(\d+(?:[.,]\d+)?)\s*(?:LT|L)\s+[Xx×]\s+(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:[.,]\d+)?)/i;

export const FUEL_PRODUCT = /(?:MOTOR[İI]N|BENZ[İI]N|D[İI]ZEL|V\s*\/?\s*MAX\s*DIESEL|LPG|EURO\s*D[İI]ESEL)/i;

export const PLATE_LINE =
  /(\d{2}\s*[A-Za-zÇĞİÖŞÜçğıöşü]{1,3}\s*\d{2,5}|\d{2}[A-Za-zÇĞİÖŞÜçğıöşü]{1,3}\d{2,5})/;

export const CHARGE_LINE = /(?:PO[ŞS]ET|PLAST[İI]K\s+PO[ŞS]ET|KARGO|AMBALAJ)/i;

export const BARE_AMOUNT_LINE = /^\s*\*[\d.,\-]+\s*$/;

export const AMOUNT_ONLY_LINE =
  /^\s*(?:\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2})\s*(?:TL)?\s*$/i;

export const VAT_ONLY_LINE = /^\s*%\s*\d+(?:[.,]\d+)?\s*$/;

/** @deprecated Prefer assignLineRoles + body_product role — kept for legacy parser paths. */
export function isLikelyProductLine(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (HEADER_METADATA.test(trimmed) && !/\*\d/.test(trimmed)) return false;
  if (DATE_ONLY_LINE.test(trimmed)) return false;
  if (VAT_LABEL.test(trimmed) || TOTAL_LABEL.test(trimmed)) return false;
  if (PAYMENT_METHOD.test(trimmed) && !/\*\d/.test(trimmed)) return false;
  if (CARD_METADATA.test(trimmed)) return false;
  if (BANK_NAME_ONLY.test(trimmed)) return false;
  if (DISCOUNT_SECTION.test(trimmed)) return false;
  if (FUEL_QTY_LINE.test(trimmed)) return false;
  if (PLATE_LINE.test(trimmed) && trimmed.length < 20) return false;
  if (/\*\s*[\d.,\-]/.test(trimmed)) return true;
  if (/%\s*\d/.test(trimmed) && /[A-Za-zÇĞİÖŞÜ]/.test(trimmed)) return true;
  if (VAT_ONLY_LINE.test(trimmed)) return false;
  if (/[A-Za-zÇĞİÖŞÜ]{3,}/.test(trimmed) && !TOTAL_LABEL.test(trimmed)) return true;
  return false;
}
