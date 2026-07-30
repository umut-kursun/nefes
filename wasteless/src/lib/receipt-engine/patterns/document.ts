/** Document-structure patterns — section detection & line typing (not merchant catalogs). */

export const GREETING_HINT =
  /\b(iyi\s*günler|iyi\s*gunler|hoş\s*geldiniz|hos\s*geldiniz|merhaba|günaydın|gunaydin|iyi\s*akşamlar)\b/i;

export const CORPORATE_SUFFIX =
  /\b(a\.?\s*ş\.?|aş|ltd\.?\s*şti\.?|limited|tic\.?\s*a\.?\s*ş\.?|san\.?\s*ve\s*tic\.?)\b/i;

export const ADDRESS_HINT =
  /\b(mah\.?|cad\.?|sok\.?|sk\.?|no:|bulvar|blv\.?|ilçe|ilce|istanbul|ankara|izmir)\b/i;

export const PHONE_HINT = /\b(tel|gsm|0\s*\(?5\d{2}\)?)\b/i;

export const WEB_FOOTER_HINT = /\b(www\.|http|\.com\b|\.tr\b)\b/i;

export const LEGAL_FOOTER_HINT =
  /\b(mersis|mersİs|kasiyer|sıra\s*no|sira\s*no|vergi\s*no|vkn|tckn|e-arşiv|e-fatura)\b/i;

export const CARD_SLIP_HINT =
  /\b(aid|app\s*label|term\s*no|ref\s*no|onay\s*kodu|batch|rrn|stan|visa|mastercard|paywave|maximum|troy|garanti|iş\s*bank|is\s*bank|ykb|akbank|ziraat|halkbank|pos\s*no)\b/i;

export const TOPKDV_HINT = /\b(topkdv|top\s*kdv)\b/i;

export const FUEL_UNIT_PRICE =
  /(\d+(?:[.,]\d+)?)\s*(?:TL\/L|TL\/LT|₺\/L|TL\/LTRE)/i;

export const FUEL_QUANTITY_LINE =
  /(\d+(?:[.,]\d+)?)\s*(?:LT|LITRE|L)\b/i;

export const PLATE_HINT =
  /\b([0-9]{2}\s*[A-ZÇĞİÖŞÜ]{1,3}\s*[0-9]{2,4})\b/;

/** Explicit purchased quantity — not weight/volume product attributes. */
export const PURCHASED_QTY_EXPLICIT =
  /\b(\d+(?:[.,]\d+)?)\s*(?:x|adet|ad\.|qty|quantity|miktar)\b|\bx\s*(\d+(?:[.,]\d+)?)\b/i;

/** Product attribute weight/volume — must NOT become purchased quantity. */
export const WEIGHT_VOLUME_ATTR =
  /\b(\d+(?:[.,]\d+)?)\s*(?:GR|G|GRAM|ML|LT|L|LITRE|KG)\b/i;

export function isGreetingLine(text: string): boolean {
  return GREETING_HINT.test(text);
}

export function isCorporateName(text: string): boolean {
  return CORPORATE_SUFFIX.test(text) || /^[A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ0-9\s.&-]{2,}$/.test(text.trim());
}

export function isCardSlipLine(text: string): boolean {
  return CARD_SLIP_HINT.test(text);
}

export function isFuelLine(text: string): boolean {
  return FUEL_UNIT_PRICE.test(text) || (FUEL_QUANTITY_LINE.test(text) && /\b(lt|litre|benzin|motorin|dizel|lpg|fuel)\b/i.test(text));
}

export function extractPurchasedQuantity(text: string): number | undefined {
  const match = text.match(PURCHASED_QTY_EXPLICIT);
  if (!match) return undefined;
  const raw = match[1] ?? match[2];
  if (!raw) return undefined;
  return parseTrQty(raw);
}

function parseTrQty(raw: string): number | undefined {
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}
