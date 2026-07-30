import type { PipelineTrace } from "./tracePipeline";
import {
  buildParserTimeline,
  type BuildParserTimelineInput,
} from "@/lib/receipt-engine-quality/timeline/buildParserTimeline";
import type { ParserTimeline } from "@/lib/receipt-engine-quality/types";
import type { OcrDocument } from "@/lib/receipt-engine/types/models/image";
import type { LayoutDocument } from "@/lib/receipt-engine/types/models/layout";
import type { ReceiptGraph } from "@/lib/receipt-engine/types/models/graph";
import type { ClassifiedGraph } from "@/lib/receipt-engine/types/models/classify";
import type { BlockDocument } from "@/lib/receipt-engine/types/models/blocks";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReport } from "@/lib/receipt-engine/types/models/validation";

export type ExtendedPipelineTrace = PipelineTrace & {
  readonly timeline: ParserTimeline;
};

export type ExtendTraceOptions = {
  readonly imageMeta?: BuildParserTimelineInput["imageMeta"];
  readonly rawOcrText?: string;
};

/** Attach parser debug timeline to an existing pipeline trace. */
export function extendTrace(
  trace: PipelineTrace,
  options: ExtendTraceOptions = {}
): ExtendedPipelineTrace {
  const timelineInput = traceToTimelineInput(trace, options);
  return {
    ...trace,
    timeline: buildParserTimeline(timelineInput),
  };
}

function traceToTimelineInput(
  trace: PipelineTrace,
  options: ExtendTraceOptions
): BuildParserTimelineInput {
  return {
    ocr: trace.stages.ocr as OcrDocument,
    layout: trace.stages.layout as LayoutDocument,
    graph: trace.stages.receiptGraph as ReceiptGraph,
    classified: {
      graph: trace.stages.receiptGraph as ReceiptGraph,
      nodes:
        (trace.stages.classifiedGraph as ClassifiedGraph).nodes ??
        (
          trace.stages.classifiedGraph as {
            nodes: ClassifiedGraph["nodes"];
            confidence: number;
          }
        ).nodes,
      confidence:
        (trace.stages.classifiedGraph as ClassifiedGraph).confidence ??
        (
          trace.stages.classifiedGraph as {
            confidence: number;
          }
        ).confidence,
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
    pipelineStartIso: trace.createdAt,
    imageMeta: options.imageMeta,
    rawOcrText: options.rawOcrText,
  };
}
