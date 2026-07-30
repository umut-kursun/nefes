import { reconstructLayout } from "@/lib/receipt-engine/layer-2-layout/layoutReconstructor";
import { buildReceiptGraph } from "@/lib/receipt-engine/layer-3-graph/buildReceiptGraph";
import { buildClassifiedGraph } from "@/lib/receipt-engine/layer-4-classify/buildClassifiedGraph";
import { buildBlockDocument } from "@/lib/receipt-engine/layer-5-blocks/buildBlockDocument";
import { buildPurchaseDraft } from "@/lib/receipt-engine/layer-6-purchase/buildPurchaseDraft";
import { buildValidationReport } from "@/lib/receipt-engine/layer-7-validate/buildValidationReport";
import type { OcrDocument } from "@/lib/receipt-engine/types/models/image";
import type { PipelineLayerTimings } from "@/lib/receipt-engine-debug/tracePipeline";
import type { ReceiptDebugImageMeta } from "@/lib/receipt-engine-debug/exportSchema";
import type { QualityPipelineOutputs } from "./types";

export type RunQualityPipelineOptions = {
  readonly profileId?: string;
  readonly imageMeta?: ReceiptDebugImageMeta;
  readonly collectTimings?: boolean;
};

function emptyTimings(): PipelineLayerTimings {
  return {
    uploadMs: 0,
    ocrMs: 0,
    layoutMs: 0,
    graphMs: 0,
    classificationMs: 0,
    blockMs: 0,
    purchaseMs: 0,
    validationMs: 0,
    totalMs: 0,
  };
}

/** Run L2–L7 parser pipeline from a normalized OCR document (test/corpus path). */
export function runQualityPipelineFromOcr(
  ocr: OcrDocument,
  options: RunQualityPipelineOptions = {}
): QualityPipelineOutputs {
  const profileId = options.profileId ?? "generic-tr";
  const collectTimings = options.collectTimings ?? true;
  const timings = emptyTimings();
  const pipelineStart = collectTimings ? Date.now() : 0;

  let layerStart = collectTimings ? Date.now() : 0;
  const layout = reconstructLayout(ocr, profileId);
  if (collectTimings) timings.layoutMs = Date.now() - layerStart;

  layerStart = collectTimings ? Date.now() : 0;
  const graph = buildReceiptGraph(layout);
  if (collectTimings) timings.graphMs = Date.now() - layerStart;

  layerStart = collectTimings ? Date.now() : 0;
  const classified = buildClassifiedGraph(graph);
  if (collectTimings) timings.classificationMs = Date.now() - layerStart;

  layerStart = collectTimings ? Date.now() : 0;
  const blocks = buildBlockDocument(classified);
  if (collectTimings) timings.blockMs = Date.now() - layerStart;

  layerStart = collectTimings ? Date.now() : 0;
  const purchase = buildPurchaseDraft(blocks);
  if (collectTimings) timings.purchaseMs = Date.now() - layerStart;

  layerStart = collectTimings ? Date.now() : 0;
  const validation = buildValidationReport(purchase);
  if (collectTimings) timings.validationMs = Date.now() - layerStart;

  if (collectTimings) {
    timings.totalMs = Date.now() - pipelineStart;
  }

  return {
    ocr,
    layout,
    graph,
    classified,
    blocks,
    purchase,
    validation,
    timings,
    imageMeta: options.imageMeta,
  };
}
