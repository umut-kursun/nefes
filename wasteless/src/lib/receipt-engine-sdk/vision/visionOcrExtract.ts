/** Minimal Vision API response — OCR + line structure only (no business logic). */



export const VISION_LINE_KINDS = [

  "product",

  "quantity",

  "discount",

  "charge",

  /** Menu/combo sub-line printed in parentheses — no standalone price. */

  "component",

] as const;



export type VisionLineKind = (typeof VISION_LINE_KINDS)[number];



export type VisionReceiptLine = {

  text: string;

  kind: VisionLineKind;

};



export const VISION_OCR_JSON_SCHEMA = `{

  "merchant": { "title": string, "category": "RESTAURANT"|"MARKET"|"FUEL"|"PHARMACY"|"RETAIL"|"OTHER" },

  "metadata": {

    "purchaseDate": "YYYY-MM-DD",

    "purchaseTime": "HH:MM:SS"|null,

    "receiptNumber": string|null,

    "currency": "TRY"

  },

  "productLines": [{ "text": string, "kind": "product"|"quantity"|"discount"|"charge"|"component" }],

  "footerLines": [string],

  "paymentLines": [string],

  "rawText": string,

  "confidence": number

}`;



export type VisionOcrExtract = {

  merchant: {

    title: string;

    category: "RESTAURANT" | "MARKET" | "FUEL" | "PHARMACY" | "RETAIL" | "OTHER";

  };

  metadata: {

    purchaseDate: string;

    purchaseTime?: string | null;

    receiptNumber?: string | null;

    currency?: string;

  };

  productLines: VisionReceiptLine[];

  footerLines: string[];

  paymentLines: string[];

  rawText: string;

  confidence: number;

};



function asRecord(value: unknown): Record<string, unknown> | null {

  return value != null && typeof value === "object" && !Array.isArray(value)

    ? (value as Record<string, unknown>)

    : null;

}



const MERCHANT_CATEGORIES = new Set([

  "RESTAURANT",

  "MARKET",

  "FUEL",

  "PHARMACY",

  "RETAIL",

  "OTHER",

]);



const VISION_LINE_KIND_SET = new Set<string>(VISION_LINE_KINDS);



function todayIsoDate(): string {

  return new Date().toISOString().slice(0, 10);

}



function coerceProductLine(raw: unknown): VisionReceiptLine | null {
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return null;
    return { text, kind: "product" };
  }

  const row = asRecord(raw);
  if (!row) return null;

  const text =
    typeof row.text === "string"
      ? row.text.trim()
      : typeof row.line === "string"
        ? row.line.trim()
        : "";
  if (!text) return null;

  const kindRaw = row.kind ?? row.lineType ?? row.type;
  const kind =
    typeof kindRaw === "string" && VISION_LINE_KIND_SET.has(kindRaw)
      ? (kindRaw as VisionLineKind)
      : "product";

  return { text, kind };
}



/** True when Vision returned the slim OCR schema (productLines[]) vs legacy products[]. */

export function isVisionOcrExtract(raw: unknown): boolean {

  const root = asRecord(raw);

  if (!root) return false;

  if (Array.isArray(root.productLines)) return true;

  return false;

}



export function coerceVisionOcrExtract(raw: unknown): VisionOcrExtract {

  const root = asRecord(raw);

  if (!root) {

    throw new Error("Vision OCR JSON must be an object");

  }



  const merchant = asRecord(root.merchant) ?? {};

  const metadata = asRecord(root.metadata) ?? {};



  const productLines = (Array.isArray(root.productLines) ? root.productLines : [])

    .map((line) => coerceProductLine(line))

    .filter((line): line is VisionReceiptLine => line != null);



  const footerLines = (Array.isArray(root.footerLines) ? root.footerLines : [])

    .map((line) => (typeof line === "string" ? line.trim() : ""))

    .filter(Boolean);



  const paymentLines = (Array.isArray(root.paymentLines) ? root.paymentLines : [])

    .map((line) => (typeof line === "string" ? line.trim() : ""))

    .filter(Boolean);



  const joined = [

    ...productLines.map((line) => line.text),

    ...footerLines,

    ...paymentLines,

  ].join("\n");

  const rawText =

    typeof root.rawText === "string" && root.rawText.trim()

      ? root.rawText.trim()

      : joined;



  const purchaseDate =

    typeof metadata.purchaseDate === "string" &&

    /^\d{4}-\d{2}-\d{2}$/.test(metadata.purchaseDate)

      ? metadata.purchaseDate

      : todayIsoDate();



  return {

    merchant: {

      title:

        typeof merchant.title === "string" && merchant.title.trim()

          ? merchant.title.trim()

          : "Bilinmeyen işyeri",

      category: MERCHANT_CATEGORIES.has(String(merchant.category))

        ? (merchant.category as VisionOcrExtract["merchant"]["category"])

        : "OTHER",

    },

    metadata: {

      purchaseDate,

      purchaseTime:

        typeof metadata.purchaseTime === "string" ? metadata.purchaseTime : null,

      receiptNumber:

        typeof metadata.receiptNumber === "string"

          ? metadata.receiptNumber

          : null,

      currency:

        typeof metadata.currency === "string" && metadata.currency.trim()

          ? metadata.currency

          : "TRY",

    },

    productLines,

    footerLines,

    paymentLines,

    rawText,

    confidence:

      typeof root.confidence === "number" &&

      root.confidence >= 0 &&

      root.confidence <= 1

        ? root.confidence

        : 0.9,

  };

}


