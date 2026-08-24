/**
 * Receipt Engine V2 — deterministic pipeline (WIP).
 * Vision layer is OCR-only; parsing runs in downstream stages.
 */

export {
  FORBIDDEN_OCR_PROMPT_TERMS,
  OCR_ONLY_VISION_PROMPT,
  VISION_RESULT_JSON_SCHEMA,
  extractJsonFromModelContent,
  parseVisionResult,
  readReceiptWithVisionOcr,
} from "./vision";

export type {
  OpenAiVisionOcrOptions,
  VisionMerchant,
  VisionMetadata,
  VisionOcrInput,
  VisionOcrProviderResult,
  VisionOcrTimings,
  VisionResult,
} from "./vision";

export {
  LINE_CLASSIFIERS,
  LINE_KINDS,
  LineKind,
  tokenizeLine,
  tokenizeReceiptLines,
  tokenizeReceiptLinesFlat,
} from "./tokenizer";

export type {
  LineKindType,
  TokenizedLine,
  TokenizedReceipt,
} from "./tokenizer";

export {
  PRODUCT_SECTION_TERMINATORS,
  buildProductBlocks,
  isProductSectionTerminator,
  parseProductBlock,
  parseProductBlocks,
} from "./parser";

export type { ProductBlock, ProductBlockBuildResult } from "./parser";
export type { ParsedDiscount, ParsedProduct, ParsedProductList } from "./parser";

export {
  FOOTER_LINE_KINDS,
  classifyPaymentType,
  extractAmount as extractFooterAmount,
  parseFooter,
} from "./footer";

export type { FooterData, FooterPayment, FooterPaymentType } from "./footer";

export { buildPurchase, runReceiptEngineV2 } from "./engine";

export type {
  Purchase,
  PurchaseMerchant,
  PurchaseMetadata,
  ReceiptEngineV2Result,
} from "./engine";

export {
  classifyLayout,
  createParserRegistry,
  defaultParserRegistry,
  CASCADE_THRESHOLDS,
  parseTurkishAmount,
} from "./core";

export type {
  ClassificationResult,
  LayoutFamily,
  ParsePath,
  ParsedCharge,
  ReceiptParser,
} from "./core";
