/** Document-structure patterns — section detection & line typing (not merchant catalogs). */

export const GREETING_HINT =
  /\b(iyi\s*günler|iyi\s*gunler|hoş\s*geldiniz|hos\s*geldiniz|merhaba|günaydın|gunaydin|iyi\s*akşamlar|teşekkür\s*ederiz|tesekkur\s*ederiz|teşekkürler|tesekkurler)\b/i;

export const CORPORATE_SUFFIX =
  /\b(a\.?\s*ş\.?|aş|ltd\.?\s*şti\.?|limited|tic\.?\s*a\.?\s*ş\.?|san\.?\s*ve\s*tic\.?)\b/i;

export const ADDRESS_HINT =
  /\b(mah\.?|cad\.?|sok\.?|sk\.?|no:|bulvar|blv\.?|ilçe|ilce|istanbul|ankara|izmir|köyü|koyu|mevki|mevkit|mevkii|köy\s*yolu|koy\s*yolu|k[uüÜ]me\s*evleri|iç\s*kapi|iç\s*kapı|blok\s*no|iç\s*kapi\s*no)\b/i;

/** City/district slash pattern e.g. DÖRTDİVAN/BOLU, TUZLA/İSTANBUL */
export const CITY_DISTRICT_HINT =
  /\b[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü.-]+\/[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü.-]+\b/;

export const PHONE_HINT = /\b(tel|gsm|0\s*\(?5\d{2}\)?)\b/i;

export const WEB_FOOTER_HINT = /\b(www\.|http|\.com\b|\.tr\b)\b/i;

export const LEGAL_FOOTER_HINT =
  /\b(mersis|mersİs|kasiyer|sıra\s*no|sira\s*no|vergi\s*no|vkn|tckn|e-arşiv|e-fatura)\b/i;

export const CARD_SLIP_HINT =
  /\b(aid|app\s*label|term\s*no|ref\s*no|onay\s*kodu|batch|rrn|stan|visa|mastercard|paywave|maximum|troy|garanti|iş\s*bank|is\s*bank|ykb|akbank|ziraat|halkbank|pos\s*no|temassiz|nus[iİ]la|kart\s*sahib|bu\s*i[sş]lem)\b/i;

export const TOPKDV_HINT = /\b(topkdv|top\s*kdv|topkd)\b/i;

export const FUEL_UNIT_PRICE =
  /(\d+(?:[.,]\d+)?)\s*(?:TL\/L|TL\/LT|₺\/L|TL\/LTRE)/i;

export const FUEL_QUANTITY_LINE =
  /(\d+,\d{3}|\d+[.,]\d{2})\s*(?:LT|L[Iİiı]K|LITRE|L)\b/i;

export const PLATE_HINT =
  /\b([0-9]{2}\s*[A-ZÇĞİÖŞÜ]{1,3}\s*[0-9]{2,4}|[0-9]{2}[A-ZÇĞİÖŞÜ]{1,3}[0-9]{2,5})\b/i;

/** Explicit purchased quantity — not weight/volume product attributes. */
export const PURCHASED_QTY_EXPLICIT =
  /\b(\d+(?:[.,]\d+)?)\s*(?:x|adet|ad\.|qty|quantity|miktar)\b|\bx\s*(\d+(?:[.,]\d+)?)\b/i;

/** Product attribute weight/volume — must NOT become purchased quantity. */
export const WEIGHT_VOLUME_ATTR =
  /\b(\d+(?:[.,]\d+)?)\s*(?:GR|G|GRAM|ML|LT|L|LITRE|KG)\b/i;

export function isGreetingLine(text: string): boolean {
  const t = text.trim();
  if (GREETING_HINT.test(t)) return true;
  if (/^teşekkür\b/i.test(t) || /^tesekkur\b/i.test(t)) return true;
  return false;
}

export function isCorporateName(text: string): boolean {
  return CORPORATE_SUFFIX.test(text) || /^[A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ0-9\s.&-]{2,}$/.test(text.trim());
}

/** Cut merchant title before neighborhood / street tokens (ÖKC headers often glue title + address). */
const NEIGHBORHOOD_STREET =
  /\s+[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü.\-]+\s+(?:MH\.|MAH\.|MAHALLE(?:Sİ|SI)?|CAD\.|CD\.|CADDES(?:İ|I)?|SK\.|SOKAK|SOK\.|NO\s*:)/i;

const STREET_KEYWORD =
  /\s+(?:MH\.|MAH\.|MAHALLE(?:Sİ|SI)?|CAD\.|CD\.|CADDES(?:İ|I)?|SK\.|SOKAK|SOK\.|NO\s*:)/i;

export function truncateMerchantTitle(text: string): string {
  const t = text.trim();
  if (!t) return t;
  const neighborhood = t.match(NEIGHBORHOOD_STREET);
  if (neighborhood?.index != null && neighborhood.index >= 3) {
    return t.slice(0, neighborhood.index).replace(/[\s,;-]+$/, "").trim();
  }
  const street = t.match(STREET_KEYWORD);
  if (street?.index != null && street.index >= 3) {
    return t.slice(0, street.index).replace(/[\s,;-]+$/, "").trim();
  }
  return t;
}

export function isAddressLikeLine(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (ADDRESS_HINT.test(t)) return true;
  if (CITY_DISTRICT_HINT.test(t)) return true;
  if (/^\s*NO:\s*\d/i.test(t)) return true;
  if (/k[oöÖ]y[uüÜ]/i.test(t)) return true;
  if (/mevk[iıİI]/i.test(t)) return true;
  if (/k[uüÜ]me\s*evler/i.test(t)) return true;
  if (/^\d{10,11}$/.test(t.replace(/\s/g, ""))) return true;
  if (/\b(vd\.?|vergi\s*daire|v\.?d\.?)\b/i.test(t) && /\d{8,}/.test(t)) return true;
  return false;
}

export function isVknLine(text: string): boolean {
  const t = text.trim().replace(/\s/g, "");
  return /^\d{10}$/.test(t) || /^\d{11}$/.test(t);
}

export function isTaxOfficeLine(text: string): boolean {
  return /\bvd\.?\b/i.test(text) || /\bvergi\s*daire/i.test(text);
}

export function isFuelLine(text: string): boolean {
  return FUEL_UNIT_PRICE.test(text) || FUEL_QUANTITY_LINE.test(text);
}

/** POS / card-acquirer slip lines (AID, ONAY KODU, İŞYERİ NO, masked PAN, etc.). */
export function isCardSlipLine(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (CARD_SLIP_HINT.test(t)) return true;
  if (/\bi[sş]yer[iıİI]\s*no\b/i.test(t)) return true;
  if (/\bi[sş]lem\s*no\b/i.test(t)) return true;
  if (/^sat[iıİI][sş]$/i.test(t)) return true;
  if (/tutar\s*kar[sş][iıİI]l[iıİI][gğ]/i.test(t)) return true;
  if (/bu\s*belgeyi\s*saklay/i.test(t)) return true;
  if (/^\*+\s*\*+\s*\*+\s*\d{4}$/.test(t)) return true;
  if (/^\*{8,}\d{4}$/.test(t.replace(/\s/g, ""))) return true;
  return false;
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
