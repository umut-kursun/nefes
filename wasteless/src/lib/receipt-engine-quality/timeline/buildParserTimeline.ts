import type { ReceiptDebugImageMeta } from "@/lib/receipt-engine-debug/exportSchema";
import type { OcrDocument } from "@/lib/receipt-engine/types/models/image";
import type { QualityPipelineOutputs, ParserTimeline, ParserTimelineStage } from "../types";

export type BuildParserTimelineInput = {
  readonly pipelineStartIso?: string;
  readonly imageMeta?: ReceiptDebugImageMeta;
  readonly rawOcrText?: string;
} & QualityPipelineOutputs;

const STAGE_DEFS: readonly { id: string; label: string; timingKey?: keyof QualityPipelineOutputs["timings"] }[] =
  [
    { id: "receipt-photo", label: "Receipt Photo" },
    { id: "ocr", label: "OCR", timingKey: "ocrMs" },
    { id: "normalized-ocr", label: "Normalized OCR" },
    { id: "layout", label: "Layout", timingKey: "layoutMs" },
    { id: "document-segmentation", label: "Document Segmentation" },
    { id: "semantic-line-classification", label: "Semantic Line Classification" },
    { id: "graph", label: "Graph", timingKey: "graphMs" },
    { id: "blocks", label: "Blocks", timingKey: "blockMs" },
    { id: "purchase-draft", label: "Purchase Draft", timingKey: "purchaseMs" },
    { id: "validation", label: "Validation", timingKey: "validationMs" },
  ];

function stagePayload(
  id: string,
  outputs: BuildParserTimelineInput,
  rawOcrText?: string
): unknown {
  switch (id) {
    case "receipt-photo":
      return outputs.imageMeta ?? { note: "No image metadata supplied" };
    case "ocr":
      return {
        source: outputs.ocr.source,
        quality: outputs.ocr.quality,
        lineCount: outputs.ocr.lines.length,
        rawText: rawOcrText ?? outputs.ocr.rawText,
      };
    case "normalized-ocr":
      return buildNormalizedOcrPayload(outputs.ocr);
    case "layout":
      return {
        profileId: outputs.layout.profileId,
        lineCount: outputs.layout.lines.length,
        confidence: outputs.layout.confidence,
        lines: outputs.layout.lines,
      };
    case "document-segmentation":
      return outputs.layout.segmentation;
    case "semantic-line-classification":
      return {
        lineTypes: outputs.layout.segmentation.lineTypes,
        lines: outputs.layout.lines.map((line) => ({
          index: line.index,
          text: line.text,
          lineSemanticType: line.lineSemanticType,
          sectionKind: line.sectionKind,
        })),
      };
    case "graph":
      return outputs.graph;
    case "blocks":
      return outputs.blocks;
    case "purchase-draft":
      return outputs.purchase;
    case "validation":
      return {
        isValid: outputs.validation.isValid,
        score: outputs.validation.score,
        errors: outputs.validation.errors,
        warnings: outputs.validation.warnings,
      };
    default:
      return null;
  }
}

function buildNormalizedOcrPayload(ocr: OcrDocument) {
  return {
    rawText: ocr.rawText,
    lines: ocr.lines,
    lineDetails: ocr.lineDetails,
    quality: ocr.quality,
    source: ocr.source,
  };
}

function offsetTimestamp(baseIso: string | undefined, offsetMs: number): string | undefined {
  if (!baseIso) return undefined;
  return new Date(new Date(baseIso).getTime() + offsetMs).toISOString();
}

/** Build ordered parser debug timeline from pipeline stage outputs. */
export function buildParserTimeline(input: BuildParserTimelineInput): ParserTimeline {
  const startIso = input.pipelineStartIso ?? new Date().toISOString();
  let elapsed = 0;
  const stages: ParserTimelineStage[] = [];

  for (const def of STAGE_DEFS) {
    const durationMs =
      def.timingKey != null ? input.timings[def.timingKey] : undefined;
    const timestamp = offsetTimestamp(startIso, elapsed);
    if (durationMs != null) elapsed += durationMs;

    stages.push({
      id: def.id,
      label: def.label,
      timestamp,
      durationMs,
      payload: stagePayload(def.id, input, input.rawOcrText),
      inspectable: true,
    });
  }

  return {
    stages: Object.freeze(stages),
    totalDurationMs: input.timings.totalMs,
  };
}
