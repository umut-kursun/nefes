import type { AnalysisResult } from "@/lib/types";
import { applyReceiptIntelligence } from "@/lib/receipt-intelligence";
import { safeParseAnalysisResult } from "@/lib/validation";
import { extractJson } from "@/lib/analyze-receipt-helpers";
import type { DocumentType } from "../types";
import { parserHintForDocument } from "./document-detection";

/** Stage 4 — parse OCR text into structured receipt data. */
export const PARSER_SYSTEM_PROMPT = `You are WasteLess, a Turkish receipt parser.
Convert OCR text into structured purchase data. Return ONLY valid JSON.

Receipt STRUCTURE:
- Identify merchant, date, product lines, VAT columns, totals, footer.
- Typical product line: Product Name | VAT % | Line Total.
- NEVER put "%10", "%20", "KDV" into product names.
- NEVER treat money amounts as quantity.
- Merge split name fragments on the same line.

Money & totals:
- totalAmount = GRAND total (GENEL TOPLAM / TOPLAM / ÖDENECEK). NEVER TOPLAM KDV.
- Turkish amounts: "1.023,50" → 1023.50
- Validation: sum(items) + sum(charges) − sum(discounts) ≈ totalAmount

Receipt-level charges & discounts (NOT products — never discard):
Classify before rejecting: Product → items | Receipt charge → charges | Discount → discounts | Payment → payments | Unknown → unknownLines
Charges (case-insensitive): Poşet, Alışveriş Poşeti, Market Poşeti, Bez Çanta, Çevre Katkı Payı, Kargo, Kargo Bedeli, Nakliye, Teslimat, Shipping, Delivery, Service Fee, Hizmet Bedeli
Example: {"type":"bag","label":"Alışveriş Poşeti","amount":0.50} or {"type":"shipping","label":"Kargo Bedeli","amount":39.90}
Discounts / coupons / indirim / iskonto → discounts[{type, label, amount}] (positive amounts; type=coupon|campaign|loyalty|other)
Payments (footer) → payments[{type, label, amount}] (type=cash|card|contactless|mixed|other)
NEVER put charges, discounts, or payments in items[]

Products:
- Keep pack size in names ("Su 1.5 L", "Pepsi Cola 330 ml").
- Each size/flavour/variant is a separate product line.
- unitPrice = totalPrice/quantity when known.

Category ids: yeme_icme, market, akaryakit, sigara, saglik, giyim, araba, faturalar, ev, other
confidence 0..1; date YYYY-MM-DD; time HH:mm

JSON schema:
{
  "sourceType": "receipt" | "bank_screenshot",
  "merchantName": string | null,
  "date": string | null,
  "time": string | null,
  "category": string,
  "subCategory": string | null,
  "currency": "TRY",
  "totalAmount": number | null,
  "confidence": number,
  "items": [{"name": string, "quantity": number|null, "unit": string|null, "unitPrice": number|null, "totalPrice": number|null}],
  "charges": [{"type": "bag"|"shipping"|"service"|"packaging"|"other", "label": string, "amount": number}],
  "discounts": [{"type": "coupon"|"campaign"|"loyalty"|"other", "label": string, "amount": number}],
  "payments": [{"type": "cash"|"card"|"contactless"|"mixed"|"other", "label": string, "amount": number|null}],
  "unknownLines": [{"label": string, "amount": number|null, "reason": string}],
  "fuel": object | null,
  "packCount": number | null,
  "rawText": string | null,
  "notes": string | null
}`;

export function buildParserUserPrompt(
  rawOcrText: string,
  documentType: DocumentType,
  sourceHint: string
): string {
  return `Parse this OCR text into structured receipt JSON.
Document type: ${documentType}
Source hint: ${sourceHint}
${parserHintForDocument(documentType, rawOcrText)}

Use the rawText field exactly as provided below — do not rewrite it.

--- OCR TEXT ---
${rawOcrText}
--- END ---

Return strict JSON only.`;
}

export type ParseStageResult =
  | { analysis: AnalysisResult; rawResponse: string }
  | {
      error: string;
      failureReason:
        | "Vision response incomplete"
        | "Line parser failed";
      status: number;
      details?: unknown;
      raw?: unknown;
    };

/** Parse Vision JSON response + run receipt intelligence (structural parser). */
export function parseStructuredReceipt(
  content: string,
  verbatimOcr: string | null
): ParseStageResult {
  let parsed: unknown;
  try {
    parsed = extractJson(content);
  } catch {
    return {
      error: "Vision response incomplete",
      failureReason: "Vision response incomplete",
      status: 502,
    };
  }

  const validated = safeParseAnalysisResult(parsed);
  if (!validated.success) {
    return {
      error: "Line parser failed",
      failureReason: "Line parser failed",
      details: validated.error.flatten(),
      raw: parsed,
      status: 422,
    };
  }

  const withOcr: AnalysisResult = {
    ...(validated.data as AnalysisResult),
    rawText: verbatimOcr ?? (validated.data as AnalysisResult).rawText,
  };

  const intelligent = applyReceiptIntelligence(withOcr);
  return {
    analysis: intelligent.analysis,
    rawResponse: content,
  };
}

/** Merge vision-structured pass with OCR-only raw text preserved. */
export function attachVerbatimOcr(
  analysis: AnalysisResult,
  verbatimOcr: string | null
): AnalysisResult {
  if (!verbatimOcr?.trim()) return analysis;
  return { ...analysis, rawText: verbatimOcr };
}
