/** Shared neutral patterns — layout + classification. No merchant/product catalog. */

export const VAT_INLINE = /%(?:\s*)(\d{1,2})(?:[.,]\d+)?/g;
export const VAT_STANDALONE = /^%?\s*\d{1,2}(?:[.,]\d+)?\s*%?$/;
export const MONEY_TAIL =
  /(\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{2})|\d+[,.]\d{2})\s*(?:tl|₺)?$/i;
export const MONEY_ONLY =
  /^(?:x\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{2})|\d+[,.]\d{2})\s*(?:tl|₺)?$/i;
export const X_TOTAL =
  /^x\s*(\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{2})|\d+[,.]\d{2}|\d+)$/i;

export const WEIGHTED_PATTERN =
  /(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gram|ml|lt|l|litre|adet)\s*(?:x|×|\*|@|:)?\s*(\d+(?:[.,]\d+)?)/i;

export const QTY_TOKEN =
  /\b(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gram|ml|lt|l|litre|adet)\b/i;
export const QTY_X_EMBED = /\bx\s*(\d{1,3}(?:[.,]\d+)?)\b/i;

/** OCR corruption of %VAT — glued x/X + rate (e.g. X10 → %10), not spaced purchase qty. */
export const VAT_OCR_X = /\b[xX×](\d{1,2})\b(?=\s*[*×x]|$)/;

export const TR_VAT_RATES = new Set([1, 8, 10, 18, 20]);

export const HAS_LETTERS = /[a-zA-ZçğıöşüÇĞİÖŞÜ]{2,}/;

export function isValidTrVatRate(rate: number): boolean {
  return TR_VAT_RATES.has(rate);
}

export function isVatOcrToken(text: string): boolean {
  const m = text.trim().match(/^%?\s*[xX×](\d{1,2})$/);
  if (!m?.[1]) return false;
  return isValidTrVatRate(Number(m[1]));
}

/** True when a matched x-quantity token is OCR VAT (X10), not purchased qty. */
export function isVatOcrQuantityMatch(matchText: string): boolean {
  const m = matchText.trim().match(/^[xX×]\s*(\d{1,2})$/i);
  if (!m?.[1]) return false;
  const glued = !/\bx\s+\d/.test(matchText);
  return glued && isValidTrVatRate(Number(m[1]));
}

export const FOOTER_HINT =
  /\b(toplam|kdv|ödenecek|odenecek|genel\s*toplam|ara\s*toplam|subtotal|nakit|kart|kredi\s*kart|para\s*üstü|paraustu|teşekkür|tesekkur|fiş\s*no|fis\s*no|z\s*no|mali\s*değer|mali\s*deger|vk[nıi]|vergi\s*no|ödenecek|odenecek)\b/i;

export const HEADER_HINT =
  /\b(limited|ltd|a\.?\s*ş\.?|aş|ticaret|sanayi|vergi\s*daire|vd\.?|tel|www\.|http|\.com\b|adres|address)\b/i;

export const BARCODE_NOISE = /^\d{8,}$/;
export const SEPARATOR_NOISE = /^\*+$/;

export const TOTAL_LABEL = /\b(toplam|genel\s*toplam|ödenecek|odenecek)\b/i;
export const SUBTOTAL_LABEL = /\b(ara\s*toplam|subtotal)\b/i;
export const PAYMENT_LABEL =
  /\b(nakit|k\.?\s*kart(?:ı|i)?|b\.?\s*banka\s*kart(?:ı|i)?|kart|kredi|kredi\s*kart|credit\s*card|para\s*üstü|paraustu|ortak\s*pos|banka\s*kart(?:ı|i)?|sanal\s*pos|ziraat|işbank|isbank|garanti|akbank|yap[iı]\s*kredi|halkbank|vak[iı]fbank)\b/i;
export const DISCOUNT_LABEL = /\b(indirim|discount|kampanya|iskonto)\b/i;
export const CHARGE_LABEL =
  /\b(poset|poşet|poseti|ambalaj|hizmet\s*bedel|kurye|teslimat)\b/i;
export const VAT_LABEL = /\b(kdv|vat)\b/i;
export const DATE_PATTERN = /\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/;
export const TIME_PATTERN = /\b(\d{1,2}[:.]\d{2}(?::\d{2})?)\b/;
export const RECEIPT_NO_PATTERN =
  /\b(f[iİ][sş]\s*no|fis\s*no|fi[sş]\s*#|z\s*no)\b/i;
export const LOYALTY_LABEL = /\b(puan|loyalty|kart\s*puan)\b/i;

/** Lowercase + fold Turkish letters for locale-safe `\b` matching (KREDİ → kredi). */
export function normalizeTrMatch(text: string): string {
  return text
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/Ş/g, "s")
    .replace(/ş/g, "s")
    .replace(/Ğ/g, "g")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/ü/g, "u")
    .replace(/Ö/g, "o")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "c")
    .replace(/ç/g, "c")
    .toLowerCase();
}

export const BARCODE_TEXT = BARCODE_NOISE;
export const SEPARATOR_TEXT = SEPARATOR_NOISE;

export function matchesTotal(text: string): boolean {
  return TOTAL_LABEL.test(text);
}

export function matchesSubtotal(text: string): boolean {
  return SUBTOTAL_LABEL.test(text);
}

export function matchesPayment(text: string): boolean {
  const t = text.trim();
  const n = normalizeTrMatch(t);
  if (/\bkart\s*sahib/.test(n)) return false;
  if (/\bbu\s*islem/.test(n)) return false;
  if (/\btemassiz/.test(n)) return false;
  if (/\bnusila/.test(n)) return false;
  return PAYMENT_LABEL.test(n);
}

export function matchesDiscount(text: string): boolean {
  return DISCOUNT_LABEL.test(text);
}

export function matchesCharge(text: string): boolean {
  return CHARGE_LABEL.test(text);
}

export function matchesVatLabel(text: string): boolean {
  return VAT_LABEL.test(text);
}

export function matchesDate(text: string): boolean {
  return DATE_PATTERN.test(text);
}

export function matchesTime(text: string): boolean {
  const match = text.match(TIME_PATTERN);
  if (!match?.[1]) return false;
  const token = match[1].replace(".", ":");
  const parts = token.split(":");
  if (parts.length < 2) return false;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return false;
  }
  return true;
}

export function matchesReceiptNumber(text: string): boolean {
  return RECEIPT_NO_PATTERN.test(text);
}

export function matchesLoyalty(text: string): boolean {
  return LOYALTY_LABEL.test(text);
}

export function matchesBarcode(text: string): boolean {
  return BARCODE_TEXT.test(text.replace(/\s/g, ""));
}

export function matchesSeparator(text: string): boolean {
  return SEPARATOR_TEXT.test(text.trim());
}

export function matchesSpecialFooterLabel(text: string): boolean {
  return (
    matchesTotal(text) ||
    matchesSubtotal(text) ||
    matchesPayment(text) ||
    matchesDiscount(text) ||
    matchesCharge(text) ||
    matchesVatLabel(text)
  );
}
