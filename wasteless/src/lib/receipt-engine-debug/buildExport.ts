import { extendTrace } from "./extendTrace";
import type { OcrDebugCapture } from "./ocrDebugCapture";
import { withImageOrientation } from "./imageOrientation";
import type { OcrDocument } from "@/lib/receipt-engine/types/models/image";
import type { LayoutDocument } from "@/lib/receipt-engine/types/models/layout";
import type { PipelineTrace } from "./tracePipeline";
import type { ReceiptDebugExport } from "./exportSchema";
import { resolveDebugVersionInfo } from "./versionInfo";
import { buildConfidenceModel } from "@/lib/receipt-engine-quality/confidence/buildConfidenceModel";
import { buildRejectedCandidates } from "@/lib/receipt-engine-quality/report/buildRejectedCandidates";
import type { QualityPipelineOutputs } from "@/lib/receipt-engine-quality/types";
import type { ReceiptGraph } from "@/lib/receipt-engine/types/models/graph";
import type { ClassifiedGraph } from "@/lib/receipt-engine/types/models/classify";
import type { BlockDocument } from "@/lib/receipt-engine/types/models/blocks";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReport } from "@/lib/receipt-engine/types/models/validation";

export type BuildDebugExportOptions = {
  trace: PipelineTrace;
  imageMeta: { width: number; height: number; sizeBytes: number };
  ocrProvider: string;
  ocrModel: string;
  ocrDurationMs: number;
  ocrCapture?: OcrDebugCapture;
  /** Overrides ocrCapture when using vision_first production path. */
  rawVisionResponse?: string;
};

export type BuildVisionFirstDebugExportOptions = {
  purchase: PurchaseDraft;
  validation: unknown;
  rawOcrText: string;
  rawVisionResponse: string;
  imageMeta: { width: number; height: number; sizeBytes: number };
  ocrModel: string;
  ocrDurationMs?: number;
  createdAt?: string;
};

function traceToQualityOutputs(trace: PipelineTrace): QualityPipelineOutputs {
  const classifiedStage = trace.stages.classifiedGraph as ClassifiedGraph & {
    nodes?: ClassifiedGraph["nodes"];
    confidence?: number;
  };

  return {
    ocr: trace.stages.ocr as OcrDocument,
    layout: trace.stages.layout as LayoutDocument,
    graph: trace.stages.receiptGraph as ReceiptGraph,
    classified: {
      graph: trace.stages.receiptGraph as ReceiptGraph,
      nodes: classifiedStage.nodes ?? [],
      confidence: classifiedStage.confidence ?? 0,
    },
    blocks: trace.stages.blockDocument as BlockDocument,
    purchase: trace.stages.purchaseDraft as PurchaseDraft,
    validation: {
      ...(trace.stages.validationReport as Omit<
        ValidationReport,
        "validatedPurchase"
      >),
      validatedPurchase: trace.stages.purchaseDraft as PurchaseDraft,
    } as ValidationReport,
    timings: trace.timings,
  };
}

function buildConfidenceSection(
  outputs: QualityPipelineOutputs
): ReceiptDebugExport["confidence"] {
  const confidence = buildConfidenceModel(outputs);
  const rejectedLines = buildRejectedCandidates(
    outputs.layout,
    outputs.purchase
  ).map((line) => ({
    lineIndex: line.lineIndex,
    text: line.text,
    reason: line.reason,
  }));

  const unknownLines = outputs.layout.lines
    .filter((line) => line.lineSemanticType === "UnknownLine")
    .map((line) => ({
      lineIndex: line.index,
      text: line.text,
      sectionKind: line.sectionKind,
    }));

  return {
    merchant: confidence.merchant,
    overall: confidence.overall,
    rejectedLines,
    unknownLines,
  };
}

export function buildReceiptDebugExport(
  options: BuildDebugExportOptions
): ReceiptDebugExport {
  const {
    trace,
    imageMeta,
    ocrProvider,
    ocrModel,
    ocrDurationMs,
    ocrCapture,
    rawVisionResponse: rawVisionOverride,
  } = options;
  const ocrStage = trace.stages.ocr as OcrDocument;
  const image = withImageOrientation(imageMeta);
  const qualityOutputs = traceToQualityOutputs(trace);
  const extended = extendTrace(trace, {
    imageMeta: image,
    rawOcrText: ocrCapture?.rawExtractText,
  });

  return {
    version: resolveDebugVersionInfo(),
    timestamp: trace.createdAt,
    image,
    ocr: {
      provider: ocrProvider,
      model: ocrModel,
      durationMs: ocrDurationMs,
      quality: ocrStage.quality,
      rawText: ocrStage.rawText,
      rawExtractText: ocrCapture?.rawExtractText,
      rawVisionResponse:
        rawVisionOverride ?? ocrCapture?.rawVisionResponse,
      lines: ocrStage.lines,
    },
    layout: trace.stages.layout,
    graph: trace.stages.receiptGraph,
    classification: trace.stages.classifiedGraph,
    blocks: trace.stages.blockDocument,
    purchase: trace.stages.purchaseDraft,
    validation: trace.stages.validationReport,
    timings: trace.timings,
    timeline: extended.timeline,
    confidence: buildConfidenceSection(qualityOutputs),
  };
}

export function formatDebugExportJson(exportData: ReceiptDebugExport): string {
  return JSON.stringify(exportData, null, 2);
}

/** Debug export for vision_first production path (no L2–L6 trace). */
export function buildVisionFirstDebugExport(
  options: BuildVisionFirstDebugExportOptions
): ReceiptDebugExport {
  const {
    purchase,
    validation,
    rawOcrText,
    rawVisionResponse,
    imageMeta,
    ocrModel,
    ocrDurationMs = 0,
    createdAt = new Date().toISOString(),
  } = options;
  const image = withImageOrientation(imageMeta);

  return {
    version: resolveDebugVersionInfo(),
    timestamp: createdAt,
    image,
    ocr: {
      provider: "openai-vision",
      model: ocrModel,
      durationMs: ocrDurationMs,
      quality: { score: 0, charCount: rawOcrText.length, lineCount: 0 },
      rawText: rawOcrText,
      rawVisionResponse,
      lines: rawOcrText.split(/\r?\n/).filter(Boolean),
    },
    layout: null,
    graph: null,
    classification: null,
    blocks: null,
    purchase,
    validation,
    timings: {
      uploadMs: 0,
      ocrMs: ocrDurationMs,
      layoutMs: 0,
      graphMs: 0,
      classificationMs: 0,
      blockMs: 0,
      purchaseMs: 0,
      validationMs: 0,
      totalMs: ocrDurationMs,
    },
    timeline: {
      stages: [
        {
          id: "vision",
          label: "Vision",
          durationMs: ocrDurationMs,
          payload: null,
          inspectable: true,
        },
        {
          id: "purchaseDraft",
          label: "PurchaseDraft",
          payload: purchase,
          inspectable: true,
        },
        {
          id: "validation",
          label: "Validation",
          payload: validation,
          inspectable: true,
        },
      ],
      totalDurationMs: ocrDurationMs,
    },
    confidence: {
      merchant: purchase.confidence ?? 0,
      overall: purchase.confidence ?? 0,
      rejectedLines: [],
      unknownLines: [],
    },
  };
}
