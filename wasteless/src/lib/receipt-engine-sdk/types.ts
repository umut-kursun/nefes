import type { PipelineLayerTimings } from "@/lib/receipt-engine-debug/tracePipeline";
import type {
  ReceiptConfidenceBreakdown,
  ReceiptDebugReport,
} from "@/lib/receipt-engine-quality/types";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ReceiptEngineVersions } from "./versioning/versions";
import type { SdkEngineConfig } from "./config/SdkEngineConfig";
import type { ReceiptEngineEventEmitter } from "./events/lifecycle";

export interface ReceiptResult {
  success: boolean;
  purchase: PurchaseDraft;
  validation: ValidationReportGolden;
  debugReport: ReceiptDebugReport;
  confidence: ReceiptConfidenceBreakdown;
  performance: Partial<PipelineLayerTimings>;
  rawOcr: { rawText: string; lines: string[] };
  normalizedOcr: { lines: string[]; rawText: string };
  versions: ReceiptEngineVersions;
  error?: { code: string; message: string };
}

export type ReceiptImageDataUrlInput = {
  imageDataUrl: string;
  altImageDataUrl?: string;
  sourceHint?: string;
  preprocessMs?: number;
};

export type ReceiptImageBufferInput = {
  imageBuffer: Buffer | Uint8Array;
  mimeType: string;
  sourceHint?: string;
};

export type ReceiptOcrTextInput = {
  ocrText: string;
  sourceHint?: string;
};

export type ReceiptAnalyzeInput =
  | ReceiptImageDataUrlInput
  | ReceiptImageBufferInput
  | ReceiptOcrTextInput;

export interface ReceiptEngineSDKOptions {
  config?: Partial<SdkEngineConfig>;
  events?: ReceiptEngineEventEmitter;
}

export type ExportFormat =
  | "json"
  | "csv"
  | "excel"
  | "markdown"
  | "html"
  | "debug-bundle"
  | "regression-bundle"
  | "quality-report";
