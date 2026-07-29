/**
 * Structural section-boundary markers.
 *
 * These are document-structure signals for the state machine — not
 * product-name heuristics. Markers decide section transitions only.
 */

/** Enter / stay in TOTALS. */
export const TOTALS_MARKER =
  /\b(topkdv|top\.?\s*kdv|genel\s*toplam|ara\s*toplam|ödenecek|odenecek|toplam|subtotal)\b/i;

/** Enter PAYMENTS (cash/card/change/pos brand). */
export const PAYMENTS_MARKER =
  /\b(nakit|kredi\s*kart(?:ı|i)?|banka\s*kart(?:ı|i)?|banka\b|para\s*üstü|paraustu|ortak\s*pos|sanal\s*pos|credit\s*card|debit|kart\s*ile|ödeme|odeme)\b/i;

/** Enter VAT_SUMMARY block (distinct from inline %8 on product lines). */
export const VAT_SUMMARY_MARKER =
  /^(?:kdv|vat|vergi)\b|\bkdv\s*(?:toplam|matrah|tutar)|%\s*\d{1,2}\s*(?:kdv|matrah)/i;

/** Enter CARD_SLIP / POS terminal metadata. */
export const CARD_SLIP_MARKER =
  /\b(aid|term(?:inal)?|onay|ref(?:erans)?|paywave|contactless|app\s*label|emv|acquirer|batch|stan|rrn|auth|visa|master\s*card|troy)\b|\*{4,}/i;

/** Enter LOYALTY. */
export const LOYALTY_MARKER =
  /\b(puan|loyalty|kart\s*puan|mil\s*puan|üye\s*no|uye\s*no)\b/i;

/** Enter FOOTER (legal / cashier / thanks). */
export const FOOTER_MARKER =
  /\b(mersis|www\.|http|kasiyer|teşekkür|tesekkur|sıra\s*no|sira\s*no|mali\s*değer|mali\s*deger|vk[nıi]|vergi\s*daire|\.com\b|işyeri|isyeri)\b/i;

/** Greeting / non-merchant header noise (scoring, not section transition). */
export const GREETING_MARKER =
  /\b(hoş\s*geldin\w*|hos\s*geldin\w*|merhaba|iyi\s*günler|iyi\s*gunler|buyurun)\b/i;

/** Explicit purchased-quantity expressions (not package attributes). */
export const EXPLICIT_PURCHASE_QTY =
  /(?:^|\s)(?:x|×)\s*(\d{1,3}(?:[.,]\d+)?)\b|\b(\d{1,3})\s*(?:adet)\b|\b(\d{1,3})\s*(?:x|×)\s+(?=\d)/i;

/** Package / attribute size embedded in product name (NOT purchased qty). */
export const PACKAGE_ATTRIBUTE =
  /\b(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gram|ml|cl|lt|l|litre)\b/i;

/** Sold-by-weight / fuel dispensed quantity: N unit x unitPrice. */
export const SOLD_QUANTITY_PATTERN =
  /(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gram|ml|lt|l|litre)\s*(?:x|×|\*|@|:)\s*(\d+(?:[.,]\d+)?)/i;

/** Fuel unit-price label. */
export const FUEL_UNIT_PRICE =
  /(\d+(?:[.,]\d+)?)\s*(?:tl|₺)?\s*\/\s*(?:l|lt|litre)\b/i;

/** Turkish plate (very rough). */
export const VEHICLE_PLATE =
  /\b([0-9]{2}\s*[A-ZÇĞİÖŞÜ]{1,3}\s*[0-9]{2,4})\b/i;
