/** Header/metadata lines that must never appear as product names. */
export const PRODUCT_POLLUTION_PATTERN =
  /(?:^TEL:|^NO:\s*\d|^\*?\d{10,}|VD:|V\.D\.|VKN|TCKN|MERS[İI]S|EPDK:|ADA NO:|BİLGİ FİŞİ|Tür:\s*e-|Fatura\/|MÜŞTERİ TCKN|ORTAK POS|SATIŞ MAĞAZASI|MAH\.|\/MUĞLA|\/İSTANBUL|\/İZMİR|BODRUM\/|T[İI]CARET|LTD|A\.Ş|SAN\.?\s*VE|KÖYÜ|D\.YOLU|L[İI]SANS NO)/i;

export const VAT_AS_PRODUCT_NAME = /^%\s*\d+(?:[.,]\d+)?\s*$/;

export const BARE_AMOUNT_AS_NAME = /^\*[\d.,\-]+$/;

export const BARE_STAR_PRICE_FRAGMENT = /^\*[\d.,]+$/;

export const LEGAL_ENTITY_MERCHANT =
  /(?:T[İI]CARET|LTD|A\.Ş|SAN\.?\s*VE|MAĞAZACILIK|İNŞAAT|ÜR\.)/i;

export const ADDRESS_LIKE_MERCHANT =
  /(?:NO:\s*\d|\/MUĞLA|\/İSTANBUL|\/İZMİR|MAH\.|CD\.|SOK\.|KÖYÜ|D\.YOLU)/i;

export function isPollutedProductName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (PRODUCT_POLLUTION_PATTERN.test(trimmed)) return true;
  if (VAT_AS_PRODUCT_NAME.test(trimmed)) return true;
  if (BARE_AMOUNT_AS_NAME.test(trimmed)) return true;
  if (/^MIGROS$/i.test(trimmed) && trimmed.length <= 8) return true;
  if (/^BÜYÜK MÜKELLEFLER/i.test(trimmed)) return true;
  return false;
}

export function foldTr(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c")
    .toLowerCase();
}

export function containsFolded(haystack: string, needle: string): boolean {
  return foldTr(haystack).includes(foldTr(needle));
}
