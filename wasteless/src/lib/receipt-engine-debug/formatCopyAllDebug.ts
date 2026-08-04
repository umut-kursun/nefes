import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import {
  finalizeVisionParsedReceipt,
  parseParsedReceiptJson,
} from "@/lib/receipt-engine-sdk/types/ParsedReceipt";

const RAW_VISION_HDR = "===== RAW VISION =====";
const OCR_HDR = "===== OCR =====";
const PARSER_HDR = "===== PARSER JSON =====";
const PURCHASE_HDR = "===== PURCHASE DRAFT =====";
const VALIDATION_HDR = "===== VALIDATION =====";
const RESULT_HDR = "===== RECEIPT ENGINE RESULT =====";

function deriveParserJson(rawVision: string, parserJson?: string): string {
  if (parserJson?.trim()) return parserJson.trim();
  if (!rawVision.trim()) return "{}";
  try {
    const parsed = finalizeVisionParsedReceipt(
      parseParsedReceiptJson(JSON.parse(rawVision.trim()))
    );
    return JSON.stringify(parsed, null, 2);
  } catch {
    return rawVision.trim();
  }
}

export function formatCopyAllDebug(options: {
  rawVision: string;
  ocr: string;
  purchase: PurchaseDraft;
  validation: ValidationReportGolden;
  analyzeResult?: unknown;
  parserJson?: string;
}): string {
  const parserSection = deriveParserJson(options.rawVision, options.parserJson);
  const purchaseDraft = JSON.stringify(options.purchase, null, 2);
  const validationJson = JSON.stringify(options.validation, null, 2);
  const resultJson =
    options.analyzeResult != null
      ? JSON.stringify(options.analyzeResult, null, 2)
      : "{}";

  return [
    RAW_VISION_HDR,
    options.rawVision,
    OCR_HDR,
    options.ocr,
    PARSER_HDR,
    parserSection,
    PURCHASE_HDR,
    purchaseDraft,
    VALIDATION_HDR,
    validationJson,
    RESULT_HDR,
    resultJson,
  ].join("\n");
}

/** @deprecated Use formatCopyAllDebug */
export const formatCopyEverythingBundle = formatCopyAllDebug;
