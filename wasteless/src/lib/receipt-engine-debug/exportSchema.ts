import type { DebugVersionInfo } from "./versionInfo";
import type { PipelineLayerTimings } from "./tracePipeline";

export type ReceiptDebugImageMeta = {
  width: number;
  height: number;
  sizeBytes: number;
};

export type ReceiptDebugOcrMeta = {
  provider: string;
  model: string;
  durationMs: number;
  quality: unknown;
  rawText: string;
  lines: readonly string[];
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
};
