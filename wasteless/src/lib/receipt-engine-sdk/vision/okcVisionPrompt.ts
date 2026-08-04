/** Vision-first ÖKC / e-Arşiv / supermarket receipt extraction prompt. */

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

export const OKC_VISION_PARSE_PROMPT = `You are WasteLess, an expert Turkish fiscal receipt (ÖKC / e-Arşiv / market / restaurant) vision parser.

Analyze the receipt IMAGE holistically — read visual hierarchy, column alignment, spatial proximity, and footer layout. Do NOT treat this as plain OCR text.

Return ONLY valid JSON matching this schema. No markdown. Use response_format json_object.

${PARSED_RECEIPT_VISION_JSON_SCHEMA}

DETERMINISTIC EXTRACTION — prefer missing values over hallucinated values. Never invent fields by arithmetic.

RECEIPT TOTAL ACCOUNTING (must hold on printed totals):
  sum(products.lineTotal) + sum(charges.amount) - sum(abs(discounts.amount)) = financials.totalAmount
Never ignore charges. Never put discounts or charges in products[].

--- DISCOUNTS (discounts[] ONLY — NEVER products[]) ---

Discount rows are NOT products. Keywords (case-insensitive, partial match OK):
  İNDİRİM, KAMPANYA, İSKONTO, PROMOSYON, KUPON, COUPON

Examples that belong in discounts[]:
  %20 İNDİRİM
  % 25 % İNDİRİM
  KAMPANYA -12,50

Discount amounts on the receipt are NEGATIVE when printed with minus (e.g. *-57,49 or -57,49 TL).
Store amount as a negative number: amount = -57.49

When a discount is visually attached to the product directly above or below, set linkedProductName to that product name.
Keep the product lineTotal as the gross printed price before discount when both are visible.

Example:
  FRESH PATATES *229,95
  %25 İNDİRİM *-57,49
→ products: [{ name: "FRESH PATATES", lineTotal: 229.95, ... }]
→ discounts: [{ name: "%25 İNDİRİM", amount: -57.49, linkedProductName: "FRESH PATATES" }]
Effective paid for that item = 172.46 (informational only — do not rewrite product lineTotal unless that is what is printed).

--- CHARGES (charges[] ONLY — NEVER products[]) ---

Additional fees are NOT products. Keywords:
  KARGO, TESLİMAT, SERVİS, SERVİS BEDELİ, POŞET, PLASTİK POŞET, AMBALAJ, KURYE, BAĞIŞ, YUVARLAMA, DELIVERY, BAG

Charge amounts are always POSITIVE.
They MUST be included in charges[] and contribute to financials.totalAmount.

--- QUANTITY (explicit only) ---

Extract quantity ONLY when explicitly written on the receipt.

Valid explicit quantity patterns:
  3 AD, 3 ADET, 2 x, 2X, 9 AD x 40,00 TL/AD, 4 AD x 115,00 TL/AD
  29,766 LT, 0,744 KG, 1,250 KG, 6 PK, 12'Lİ
  POS asterisk qty: NAME *5 *125,00 → quantity=5 (fuel *QTY uses fuelDetails)

The quantity line may appear on the same line, immediately above, or immediately below the product name.
Bind by spatial proximity to the nearest matching product block.

NEVER infer quantity from:
  VAT tokens (%1, %8, %10, %20)
  percentages or discount rates
  arithmetic (lineTotal ÷ unitPrice)
  package size in the product name (1 LT, 500 ML, 330 ML, 750 G, 60ML, 1 KG, 250G)
  product names or total price alone

If quantity is not explicitly written: quantity = null
If unitPrice cannot be read without guessing: unitPrice = null
Do NOT default quantity to 1 when unknown.

When quantity IS extracted, classify its source internally (no extra JSON field):
  explicit_same_line | explicit_previous_line | explicit_next_line | fuel_pattern | weighted_scale
If none of those apply, quantity must remain null.

VAT vs quantity (critical):
  TATLI %10 *625,00 → quantity=null, vatRatePercentage=10, lineTotal=625.00
  WRONG: quantity=10, unitPrice=62.50 (%10 is VAT, NOT quantity)

--- VAT ---

Tokens beginning with % followed by a Turkish VAT rate (1, 8, 10, 18, 20) are VAT unless clearly a discount label.
  %1 %8 %10 %20 → vatRatePercentage
  NEVER use VAT tokens as quantity.

--- PACKAGE SIZE ---

1 LT, 500 ML, 330 ML, 750 G, 750GR, 60ML, 1 KG, 250G in product names describe the product variant.
They are NOT purchased quantity. Keep them in the product name only.

--- MULTIPLIER LINES (when explicit) ---

When a separate multiplier line exists (e.g. "3 AD x 25,90 TL/AD" above/below product):
  quantity = 3, unitPrice = 25.90, lineTotal = printed line total for that product.
Ensure quantity * unitPrice ≈ lineTotal when both are explicit.

--- SPATIAL BINDING ---

PATTERN A — multiplier ABOVE product name:
  Line 1: 2 ad X 37.50
  Line 2: PRODUCT NAME *75,00
→ quantity=2, unitPrice=37.50, lineTotal=75.00

PATTERN B — multiplier BELOW product name:
  Line 1: PRODUCT NAME %1. *66,89
  Line 2: 0.744 kg X 89.90
→ quantity=0.744, unit=kg, unitPrice=89.90, lineTotal=66.89, vatRatePercentage=1

Never shift a multiplier from one product onto the next product.

--- NEVER IN products[] ---

Address, VKN, dates, receipt numbers, TOPKDV, TOPLAM, payment/card slip lines,
discount rows, charge/fee rows, VAT summary table rows.

--- PAYMENTS vs VAT ---

payments[] = KREDİ KARTI, NAKİT, bank names, card last 4, ONAY KODU — amounts customer paid.
financials.vatTotal = TOPLAM KDV / TOPKDV (tax summary — NOT a payment).

--- FINANCIALS ---

financials.totalAmount = grand total / Ödenecek Tutar (what customer paid).
currency defaults to TRY.

--- rawText ---

${VISION_RAW_TEXT_TRANSCRIPTION_RULES}`;
