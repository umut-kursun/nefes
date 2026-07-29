import {
  createEngineDependencies,
  createDefaultLayerStack,
  executeLayer,
  formatGraphDebug,
  formatClassificationDebug,
  formatBlockDebug,
  formatPurchaseDebug,
  formatValidationDebug,
} from "@/lib/receipt-engine";
import { createLayerContext } from "@/lib/receipt-engine/pipeline/layerContext";
import { stripValidatedPurchase } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import { createStubLayoutProfileRegistry } from "@/lib/receipt-engine/config/profiles";
import { resolveEngineConfig } from "@/lib/receipt-engine/config/defaults";
import type { OcrDocument } from "@/lib/receipt-engine/types/models/image";
import type { LayoutDocument } from "@/lib/receipt-engine/types/models/layout";
import type { ReceiptEngineInput } from "@/lib/receipt-engine/types/pipeline";
import type { EngineDependencies } from "@/lib/receipt-engine/pipeline/dependencies";
import { toPlainJson } from "./serialize";

export type PipelineTraceStageKey =
  | "ocr"
  | "layout"
  | "receiptGraph"
  | "classifiedGraph"
  | "blockDocument"
  | "purchaseDraft"
  | "validationReport";

export type PipelineTraceStages = Record<PipelineTraceStageKey, unknown>;

export type PipelineTraceText = Record<PipelineTraceStageKey, string>;

export type PipelineLayerTimings = {
  uploadMs: number;
  ocrMs: number;
  layoutMs: number;
  graphMs: number;
  classificationMs: number;
  blockMs: number;
  purchaseMs: number;
  validationMs: number;
  totalMs: number;
};

export type PipelineTrace = {
  traceId: string;
  createdAt: string;
  sourceHint: string;
  imageDataUrl: string;
  stages: PipelineTraceStages;
  textDebug: PipelineTraceText;
  timings: PipelineLayerTimings;
  savedTo?: string;
};

async function runInstrumentedPipeline(
  input: ReceiptEngineInput,
  deps: EngineDependencies
) {
  const layers = createDefaultLayerStack();
  const ctx = createLayerContext(deps);
  const pipelineStart = Date.now();

  let layerStart = Date.now();
  const l0 = await executeLayer(layers.l0, input, ctx);
  const uploadMs = Date.now() - layerStart;

  layerStart = Date.now();
  const l1 = await executeLayer(layers.l1, l0.output, ctx);
  const ocrMs = Date.now() - layerStart;

  layerStart = Date.now();
  const l2 = await executeLayer(layers.l2, l1.output, ctx);
  const layoutMs = Date.now() - layerStart;

  layerStart = Date.now();
  const l3 = await executeLayer(layers.l3, l2.output, ctx);
  const graphMs = Date.now() - layerStart;

  layerStart = Date.now();
  const l4 = await executeLayer(layers.l4, l3.output, ctx);
  const classificationMs = Date.now() - layerStart;

  layerStart = Date.now();
  const l5 = await executeLayer(layers.l5, l4.output, ctx);
  const blockMs = Date.now() - layerStart;

  layerStart = Date.now();
  const l6 = await executeLayer(layers.l6, { blocks: l5.output }, ctx);
  const purchaseMs = Date.now() - layerStart;

  layerStart = Date.now();
  const l7 = await executeLayer(layers.l7, l6.output, ctx);
  const validationMs = Date.now() - layerStart;

  return {
    outputs: { l1, l2, l3, l4, l5, l6, l7 },
    timings: {
      uploadMs,
      ocrMs,
      layoutMs,
      graphMs,
      classificationMs,
      blockMs,
      purchaseMs,
      validationMs,
      totalMs: Date.now() - pipelineStart,
    },
  };
}

function createTraceId(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `trace-${stamp}`;
}

export async function traceReceiptEngine(
  input: ReceiptEngineInput,
  deps: EngineDependencies
): Promise<PipelineTrace> {
  const { outputs, timings } = await runInstrumentedPipeline(input, deps);
  const { l1, l2, l3, l4, l5, l6, l7 } = outputs;

  const validationGolden = stripValidatedPurchase(l7.output);

  const stages: PipelineTraceStages = {
    ocr: toPlainJson(l1.output),
    layout: toPlainJson(l2.output),
    receiptGraph: toPlainJson(l3.output),
    classifiedGraph: toPlainJson({
      confidence: l4.output.confidence,
      nodes: l4.output.nodes,
    }),
    blockDocument: toPlainJson(l5.output),
    purchaseDraft: toPlainJson(l6.output),
    validationReport: toPlainJson(validationGolden),
  };

  const textDebug: PipelineTraceText = {
    ocr: formatOcrDebug(l1.output),
    layout: formatLayoutDebug(l2.output),
    receiptGraph: formatGraphDebug(l3.output),
    classifiedGraph: formatClassificationDebug(l4.output),
    blockDocument: formatBlockDebug(l5.output),
    purchaseDraft: formatPurchaseDebug(l6.output),
    validationReport: formatValidationDebug(l7.output),
  };

  return {
    traceId: createTraceId(),
    createdAt: new Date().toISOString(),
    sourceHint: input.sourceHint ?? "receipt",
    imageDataUrl: input.imageDataUrl ?? input.imagePrimary.dataUrl,
    stages,
    textDebug,
    timings,
  };
}

function formatOcrDebug(ocr: OcrDocument): string {
  const lines = [
    `OcrDocument lines=${ocr.lines.length} quality=${ocr.quality.score.toFixed(2)} chars=${ocr.quality.charCount} source=${ocr.source}`,
    "",
    "lines:",
  ];
  const details = ocr.lineDetails;
  ocr.lines.forEach((text, index) => {
    const conf = details?.[index]?.confidence;
    const confLabel =
      conf !== undefined ? ` conf=${conf.toFixed(2)}` : "";
    lines.push(`  L${index}: ${text}${confLabel}`);
  });
  return lines.join("\n");
}

function formatLayoutDebug(layout: LayoutDocument): string {
  const lines = [
    `LayoutDocument profile=${layout.profileId} lines=${layout.lines.length} confidence=${layout.confidence.toFixed(2)}`,
    "",
  ];
  for (const line of layout.lines) {
    const amount =
      line.trailingAmount != null ? ` amount=${line.trailingAmount}` : "";
    lines.push(`  L${line.index} [${line.region}] ${line.text}${amount}`);
  }
  return lines.join("\n");
}

export function createTraceDependencies(options: {
  apiKey: string;
  model?: string;
}): EngineDependencies {
  const config = resolveEngineConfig({ debug: true });
  return createEngineDependencies({
    config,
    layoutProfiles: createStubLayoutProfileRegistry(
      config.defaultLayoutProfileId
    ),
    ocrProviderOptions: {
      kind: "openai",
      openAi: {
        apiKey: options.apiKey,
        model: options.model ?? process.env.OPENAI_OCR_MODEL ?? "gpt-4o-mini",
      },
    },
  });
}
