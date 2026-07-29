import type { OcrDocument } from "@/lib/receipt-engine/types/models/image";
import type { PipelineTrace } from "./tracePipeline";
import type { ReceiptDebugExport } from "./exportSchema";
import { resolveDebugVersionInfo } from "./versionInfo";

export type BuildDebugExportOptions = {
  trace: PipelineTrace;
  imageMeta: { width: number; height: number; sizeBytes: number };
  ocrProvider: string;
  ocrModel: string;
  ocrDurationMs: number;
};

export function buildReceiptDebugExport(
  options: BuildDebugExportOptions
): ReceiptDebugExport {
  const { trace, imageMeta, ocrProvider, ocrModel, ocrDurationMs } = options;
  const ocrStage = trace.stages.ocr as OcrDocument;

  return {
    version: resolveDebugVersionInfo(),
    timestamp: trace.createdAt,
    image: imageMeta,
    ocr: {
      provider: ocrProvider,
      model: ocrModel,
      durationMs: ocrDurationMs,
      quality: ocrStage.quality,
      rawText: ocrStage.rawText,
      lines: ocrStage.lines,
    },
    layout: trace.stages.layout,
    graph: trace.stages.receiptGraph,
    classification: trace.stages.classifiedGraph,
    blocks: trace.stages.blockDocument,
    purchase: trace.stages.purchaseDraft,
    validation: trace.stages.validationReport,
    timings: trace.timings,
  };
}

export function formatDebugExportJson(exportData: ReceiptDebugExport): string {
  return JSON.stringify(exportData, null, 2);
}
