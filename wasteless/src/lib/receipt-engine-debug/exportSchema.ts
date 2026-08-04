import type { ParserTimeline } from "@/lib/receipt-engine-quality/types";
import type { DebugVersionInfo } from "./versionInfo";
import type { PipelineLayerTimings } from "./tracePipeline";

export type ReceiptDebugImageMeta = {
  width: number;
  height: number;
  sizeBytes: number;
  orientation?: "portrait" | "landscape" | "square";
};

export type ReceiptDebugOcrMeta = {
  provider: string;
  model: string;
  durationMs: number;
  quality: unknown;
  /** Normalized OCR text that enters the Receipt Engine parser. */
  rawText: string;
  /** Pre-normalization rawText from the OCR provider extract step. */
  rawExtractText?: string;
  /** Exact OpenAI message.content before any parsing. */
  rawVisionResponse?: string;
  lines: readonly string[];
};

export type ReceiptDebugConfidence = {
  merchant: number;
  overall: number;
  rejectedLines: readonly {
    lineIndex: number;
    text: string;
    reason: string;
  }[];
  unknownLines: readonly {
    lineIndex: number;
    text: string;
    sectionKind: string;
  }[];
};

export type ReceiptDebugExport = {
  version: DebugVersionInfo;
  timestamp: string;
  image: ReceiptDebugImageMeta;
  ocr: ReceiptDebugOcrMeta;
  layout: unknown;
  graph: unknown;
  classification: unknown;
  blocks: unknown;
  purchase: unknown;
  validation: unknown;
  timings: PipelineLayerTimings;
  timeline?: ParserTimeline;
  confidence?: ReceiptDebugConfidence;
};
