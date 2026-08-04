/** Shared semantic patterns â€” prefer over long regex chains at call sites. */

export const NON_PRODUCT_LABEL =
  /\b(topkdv|top\s*kdv|kdv|toplam|ara\s*toplam|genel\s*toplam|nakit|kredi\s*kart|credit|debit|multinet|sodexo|ticket|ortak\s*pos|pos\s*Ã¶deme|pos\s*odeme|fiÅŸ\s*no|fis\s*no|z\s*no|receipt\s*no|saat|tarih|kasiyer|vergi\s*no|vkn|mersis|e-arÅŸiv|e-fatura)\b/i;

export const PAYMENT_LABEL =
  /\b(nakit|kredi\s*kart|credit\s*card|debit|multinet|sodexo|ticket|ortak\s*pos|or\s*tak\s*pos|ortakpos|banka\s*kart|visa|mastercard|troy)\b/i;

export const TOTAL_LABEL = /\btoplam(?:\b|\d)|\bto\s*plam\b|\bgenel\s*toplam\b|\btotal\b/i;

export const VAT_LABEL = /\btopkdv(?:\b|\d)|\bto\s*pkdv\b|\btop\s*kdv\b|\bkdv\s*toplam\b/i;

export const CHARGE_LABEL = /\b(poset\w*|poÅŸet\w*|ambalaj|hizmet\s*bedel|kargo)\b/i;

export const ADDRESS_LABEL =
  /\b(mah\.?|cad\.?|sok\.?|sk\.?|mah\\.?|cad\\.?|sokak|sok\\.|sk\\.|bulvar|blv\.?|no:|ilÃ§e|ilce|istanbul|ankara|izmir)\b/i;

export const PHONE_LABEL = /\b(tel|gsm|0\s*\(?5\d{2}\)?)\b/i;

export const WEB_LABEL = /\b(www\.|http|\.com\b|\.tr\b)\b/i;

export const CORPORATE_SUFFIX =
  /\b(a\.?\s*ÅŸ\.?|aÅŸ|a\.s\.?|ltd\.?\s*ÅŸti\.?|limited|tic\.?\s*a\.?\s*ÅŸ\.?|san\.?\s*ve\s*tic\.?|petrol)\b/i;

export const FUEL_LINE =
  /\b(benzin|motorin|dizel|lpg|fuel)\b.*(\d+(?:[.,]\d{1,3})?)\s*(?:LT|LITRE|L)\b/i;

export const FUEL_UNIT_PRICE = /(\d+(?:[.,]\d+)?)\s*(?:TL\/L|TL\/LT|â‚º\/L)/i;

export const PLATE_LABEL =
  /\b([0-9]{2}\s*[A-ZÃ‡ÄÄ°Ã–ÅÃœ]{1,3}\s*[0-9]{2,4})\b/;

export const RECEIPT_NO_LABEL = /\b(fiÅŸ\s*no|fis\s*no|receipt\s*no)\s*[:#]?\s*(\d+)/i;

export const Z_NO_LABEL = /\b(z\s*no)\s*[:#]?\s*(\d+)/i;

export const DATE_LABEL =
  /\b(\d{1,2}[./\s-]\d{1,2}[./\s-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/;

export const TIME_LABEL = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/;

export const CARD_SLIP_LABEL =
  /\b(aid|visa|mastercard|troy|paywave|term\s*no|ref\s*no|onay\s*kodu|batch|rrn|stan)\b/i;

export const AMOUNT_ONLY = /^[\s\d.,]+(?:\s*TL|\s*â‚º)?\s*$/i;

export function parseTrAmount(text: string): number | undefined {
  const match = text.match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})|\d+(?:,\d{1,2})?)/);
  if (!match) return undefined;
  const raw = match[1].replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function trailingAmount(text: string): number | undefined {
  const parts = text.trim().split(/\s+/);
  for (let i = parts.length - 1; i >= 0; i--) {
    const n = parseTrAmount(parts[i] ?? "");
    if (n != null) return n;
  }
  return undefined;
}
