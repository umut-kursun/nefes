/** Vision-first ÖKC / e-Arşiv receipt extraction prompt — full JSON contract, concise rules. */

import { VISION_RAW_TEXT_TRANSCRIPTION_RULES } from "@/lib/receipt-ocr-vision-rules";

export const PARSED_RECEIPT_VISION_JSON_SCHEMA = `{
  "merchant": {
    "title": string,
    "vknTckn": string | null,
    "taxOffice": string | null,
    "address": string | null,
    "category": "RESTAURANT" | "MARKET" | "FUEL" | "PHARMACY" | "RETAIL" | "OTHER"
  },
  "metadata": {
    "purchaseDate": "YYYY-MM-DD",
    "purchaseTime": "HH:MM:SS" | null,
    "receiptNumber": string | null,
    "currency": "TRY"
  },
  "products": [{
    "name": string,
    "quantity": number | null,
    "unit": "kg" | "g" | "ad" | "L" | "ml" | "PK" | null,
    "unitPrice": number | null,
    "lineTotal": number,
    "vatRatePercentage": 1 | 8 | 10 | 18 | 20 | null
  }],
  "discounts": [{
    "name": string,
    "amount": number,
    "vatRatePercentage": 1 | 8 | 10 | 18 | 20 | null,
    "linkedProductName": string | null
  }],
  "charges": [{
    "name": string,
    "amount": number
  }],
  "payments": [{
    "type": "CREDIT_CARD" | "CASH" | "OTHER",
    "bankName": string | null,
    "cardLastFour": string | null,
    "approvalCode": string | null,
    "amount": number
  }],
  "financials": {
    "subtotal": number | null,
    "vatTotal": number | null,
    "discountTotal": number | null,
    "totalAmount": number
  },
  "fuelDetails": null | { "plateNumber": string | null, "pumpNumber": number | null, "liters": number | null, "pricePerLiter": number | null },
  "rawText": string,
  "confidence": number
}`;

export const OKC_VISION_PARSE_PROMPT = `Turkish fiscal receipt (ÖKC / e-Arşiv / market / restaurant) vision parser.

Read the image holistically — columns, spacing, print order. Return ONLY valid JSON (response_format json_object). No markdown.

${PARSED_RECEIPT_VISION_JSON_SCHEMA}

ARRAY ROUTING:
- products[] — item rows with printed lineTotal. Optional quantity, unit, unitPrice, vatRatePercentage when explicitly visible.
- discounts[] — İNDİRİM, KAMPANYA, İSKONTO, KUPON rows. NOT products. amount negative when printed with minus (*-57,49).
- charges[] — POŞET, PLASTİK POŞET, KARGO, SERVİS, AMBALAJ fees. NOT products. Always positive.
- payments[] — Kredi Kartı, Nakit, card slip payment amounts.
- financials.totalAmount — TOPLAM / grand total on receipt.

QUANTITY (explicit only — null when not printed):
- Valid: "3 AD", "9 AD x 40,00 TL/AD", "0.744 KG", "0.425 KG x 199,95 TL/KG", same-line *5 *125,00
- Multiplier line may be above OR below product — bind by spatial proximity.
- NEVER infer qty from VAT % (%10 → vatRatePercentage only, NOT quantity).
- NEVER infer from pack size in name (60ML, 1 LT, 750G, 1 KG).

MIGROS (critical):
- "9 AD x 40,00 TL/AD" → quantity=9, unitPrice=40.00 on nearest product block (e.g. ALGIDA FRIGOLA).
- "4 AD x 115,00 TL/AD" → bind to MARLBORO / tobacco row below or above.
- "0.425 KG x 199,95 TL/KG" → quantity=0.425, unit=kg, unitPrice=199.95 on weighted product.
- "% 25 % İNDİRİM *-57,49" → discounts[] with linkedProductName when visually bound.

NEVER in products[]: address, VKN, dates, receipt numbers, TOPKDV, TOPLAM, payment lines, discount rows, charge rows, VAT summary tables.

Combo/menu sub-lines in parentheses with no price (e.g. "(Super Coca Cola)") — omit from products[] unless they carry a line total.

Prefer null over guessing. lineTotal must match printed amount on each row.

${VISION_RAW_TEXT_TRANSCRIPTION_RULES}`;
