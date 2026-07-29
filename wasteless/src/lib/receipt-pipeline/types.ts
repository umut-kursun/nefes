import type { AnalysisResult, OcrCorrection } from "@/lib/types";
import type { CatalogSnapshot } from "@/lib/product-knowledge/catalogSnapshot";

/** Supported document types — each may use a different extraction strategy. */
export type DocumentType =
  | "thermal_receipt"
  | "e_arsiv"
  | "pdf_invoice"
  | "fuel_receipt"
  | "restaurant_receipt"
  | "pharmacy_receipt"
  | "bank_screenshot"
  | "unknown";

export type PipelineStageName =
  | "document_detection"
  | "preprocess"
  | "ocr"
  | "receipt_parser"
  | "product_knowledge"
  | "confidence"
  | "learning";

export type StageLogEntry = {
  stage: PipelineStageName;
  ms: number;
  notes: string[];
};

export type PipelineInput = {
  /** Preprocessed image data URL sent to Vision. */
  imageDataUrl: string;
  /** Optional threshold variant for retry OCR. */
  altImageDataUrl?: string;
  /** Original photo for display/storage. */
  displayDataUrl: string;
  sourceHint: string;
  apiKey: string;
  model: string;
  fallbackModel: string;
  /** Learned OCR→productId aliases from IndexedDB. */
  learnedAliases?: Array<{ ocr: string; productId: string }>;
  /** User corrections to apply (stage 8). */
  corrections?: OcrCorrection[];
  /** Client-side image preprocessing duration (ms). */
  preprocessMs?: number;
  /** Canonical KV catalog snapshot — used for product matching on Worker. */
  catalogSnapshot?: CatalogSnapshot | null;
  /** When KV unavailable, seed catalog is used and this note is logged. */
  catalogFallbackNote?: string;
};

export type PipelineResult = {
  analysis: AnalysisResult;
  documentType: DocumentType;
  /** Verbatim OCR text — never normalized in stage 3. */
  rawOcrText: string | null;
  rawAiResponse: string;
  passes: number;
  stageLog: StageLogEntry[];
  intelligenceCorrections: string[];
  correctionsApplied: number;
  debug: import("./debug").PipelineDebug;
};
