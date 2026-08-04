import {
  createDefaultLayerStack,
  createEngineDependencies,
  executeLayer,
} from "@/lib/receipt-engine";
import { createLayerContext } from "@/lib/receipt-engine/pipeline/layerContext";
import { createStubLayoutProfileRegistry } from "@/lib/receipt-engine/config/profiles";
import { reconstructLayout } from "@/lib/receipt-engine/layer-2-layout/layoutReconstructor";
import { buildReceiptGraph } from "@/lib/receipt-engine/layer-3-graph/buildReceiptGraph";
import { buildClassifiedGraph } from "@/lib/receipt-engine/layer-4-classify/buildClassifiedGraph";
import { buildBlockDocument } from "@/lib/receipt-engine/layer-5-blocks/buildBlockDocument";
import { buildPurchaseDraft } from "@/lib/receipt-engine/layer-6-purchase/buildPurchaseDraft";
import { buildValidationReport } from "@/lib/receipt-engine/layer-7-validate/buildValidationReport";
import { stripValidatedPurchase } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import { ocrDocumentFromRaw } from "@/lib/receipt-engine/layer-1-ocr/normalizeOcrDocument";
import {
  emptyBlockDocument,
  emptyClassifiedGraph,
  emptyReceiptGraph,
} from "@/lib/receipt-engine/types/index";
import { emptyLayoutDocument } from "@/lib/receipt-engine/types/models/layout";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReport } from "@/lib/receipt-engine/types/models/validation";
import { parsedReceiptToPurchaseDraft } from "./adapters/parsedReceiptToPurchaseDraft";
import { parseReceiptWithVisionRetry } from "./vision/visionParseWithRetry";
import type { OcrDocument } from "@/lib/receipt-engine/types/models/image";
import type { ReceiptEngineInput } from "@/lib/receipt-engine/types/pipeline";
import type { EngineDependencies } from "@/lib/receipt-engine/pipeline/dependencies";
import type { PipelineLayerTimings } from "@/lib/receipt-engine-debug/tracePipeline";
import { buildConfidenceModel } from "@/lib/receipt-engine-quality/confidence/buildConfidenceModel";
import { buildDebugReport } from "@/lib/receipt-engine-quality/report/buildDebugReport";
import type { QualityPipelineOutputs } from "@/lib/receipt-engine-quality/types";
import type { SdkEngineConfig } from "./config/SdkEngineConfig";
import type { ReceiptEngineEventEmitter } from "./events/lifecycle";
import { ocrProviderRegistry } from "./ocr/ocrProviderRegistry";
import type { OcrProviderFactoryOptions } from "./ocr/ocrProviderRegistry";

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

function bufferToDataUrl(buffer: Buffer | Uint8Array, mimeType: string): string {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function createDeps(
  config: SdkEngineConfig,
  ocrFactoryOptions?: OcrProviderFactoryOptions
): EngineDependencies {
  const ocrProvider = ocrProviderRegistry.resolve(
    config.ocrProviderId,
    ocrFactoryOptions
  );
  return createEngineDependencies({
    config,
    layoutProfiles: createStubLayoutProfileRegistry(config.defaultLayoutProfileId),
    ocrProvider,
  });
}

function toQualityOutputs(
  ocr: OcrDocument,
  pipeline: ReturnType<typeof runParserStages> extends Promise<infer T>
    ? T
    : never,
  timings: Partial<PipelineLayerTimings>
): QualityPipelineOutputs {
  return {
    ocr,
    layout: pipeline.layout,
    graph: pipeline.graph,
    classified: pipeline.classified,
    blocks: pipeline.blocks,
    purchase: pipeline.purchase,
    validation: pipeline.validation,
    timings,
  };
}

async function runParserStages(
  ocr: OcrDocument,
  profileId: string,
  emitter: ReceiptEngineEventEmitter | undefined,
  collectTimings: boolean
) {
  const timings = emptyTimings();
  const pipelineStart = collectTimings ? Date.now() : 0;

  let layerStart = collectTimings ? Date.now() : 0;
  const layout = reconstructLayout(ocr, profileId);
  if (collectTimings) timings.layoutMs = Date.now() - layerStart;
  emitter?.emit("onLayoutFinished", { layout, durationMs: timings.layoutMs ?? 0 });
  emitter?.emit("onSegmentationFinished", {
    layout,
    durationMs: timings.layoutMs ?? 0,
  });

  layerStart = collectTimings ? Date.now() : 0;
  const graph = buildReceiptGraph(layout);
  if (collectTimings) timings.graphMs = Date.now() - layerStart;

  layerStart = collectTimings ? Date.now() : 0;
  const classified = buildClassifiedGraph(graph);
  if (collectTimings) timings.classificationMs = Date.now() - layerStart;
  emitter?.emit("onClassificationFinished", {
    classified,
    graph,
    durationMs: timings.classificationMs ?? 0,
  });

  layerStart = collectTimings ? Date.now() : 0;
  const blocks = buildBlockDocument(classified);
  if (collectTimings) timings.blockMs = Date.now() - layerStart;

  layerStart = collectTimings ? Date.now() : 0;
  const purchase = buildPurchaseDraft(blocks);
  if (collectTimings) timings.purchaseMs = Date.now() - layerStart;
  emitter?.emit("onPurchaseDraftCreated", {
    purchase,
    durationMs: timings.purchaseMs ?? 0,
  });

  layerStart = collectTimings ? Date.now() : 0;
  const validation = buildValidationReport(purchase);
  if (collectTimings) timings.validationMs = Date.now() - layerStart;
  const validationGolden = stripValidatedPurchase(validation);
  emitter?.emit("onValidationFinished", {
    validation: validationGolden,
    purchase,
    durationMs: timings.validationMs ?? 0,
  });

  if (collectTimings) {
    timings.totalMs = Date.now() - pipelineStart;
  }

  return {
    layout,
    graph,
    classified,
    blocks,
    purchase,
    validation,
    validationGolden,
    timings,
  };
}

export async function orchestrateFromOcrText(
  ocrText: string,
  config: SdkEngineConfig,
  emitter?: ReceiptEngineEventEmitter
) {
  const ocr = ocrDocumentFromRaw(ocrText);
  emitter?.emit("onOCRFinished", { ocr, durationMs: 0 });

  const collectTimings = config.modes.performance;
  const pipeline = await runParserStages(
    ocr,
    config.defaultLayoutProfileId,
    emitter,
    collectTimings
  );

  const outputs = toQualityOutputs(ocr, pipeline, pipeline.timings);
  const confidence = buildConfidenceModel(outputs);
  const boostedOverall = config.merchantProfiles.applyConfidenceBoost(
    confidence.overall,
    ocr.rawText
  );
  const confidenceWithBoost = { ...confidence, overall: boostedOverall };

  const debugReport = config.modes.quality
    ? buildDebugReport(outputs, { receiptId: config.defaultLayoutProfileId })
    : buildDebugReport(outputs, { receiptId: "sdk" });

  return {
    ocr,
    purchase: pipeline.purchase,
    validation: pipeline.validationGolden,
    debugReport: config.modes.quality
      ? debugReport
      : { ...debugReport, confidence: confidenceWithBoost },
    confidence: confidenceWithBoost,
    performance: pipeline.timings,
  };
}

function buildVisionOnlyQualityOutputs(
  purchase: PurchaseDraft,
  validation: ValidationReport,
  ocr: OcrDocument,
  timings: Partial<PipelineLayerTimings>,
  profileId: string
): QualityPipelineOutputs {
  const layout = emptyLayoutDocument(profileId);
  const graph = emptyReceiptGraph(profileId);
  const classified = emptyClassifiedGraph(graph);
  const blocks = emptyBlockDocument();
  return {
    ocr,
    layout,
    graph,
    classified,
    blocks,
    purchase,
    validation,
    timings,
  };
}

function canUseDirectVision(
  input: ReceiptEngineInput,
  config: SdkEngineConfig,
  ocrFactoryOptions?: OcrProviderFactoryOptions
): boolean {
  return (
    config.parserMode === "vision_first" &&
    Boolean(input.imagePrimary?.dataUrl && ocrFactoryOptions?.openAi?.apiKey)
  );
}

export async function orchestrateFromImage(
  input: ReceiptEngineInput,
  config: SdkEngineConfig,
  ocrFactoryOptions?: OcrProviderFactoryOptions,
  emitter?: ReceiptEngineEventEmitter
) {
  const collectTimings = config.modes.performance;
  const timings = emptyTimings();
  const pipelineStart = collectTimings ? Date.now() : 0;

  if (canUseDirectVision(input, config, ocrFactoryOptions)) {
    try {
      const visionStart = collectTimings ? Date.now() : 0;
      const visionInput = {
        imageDataUrl: input.imagePrimary!.dataUrl,
        altImageDataUrl: input.imageAlt?.dataUrl,
      };
      const visionOptions = {
        apiKey: ocrFactoryOptions!.openAi!.apiKey,
        model: ocrFactoryOptions!.openAi!.model,
        maxRetries: 1,
      };

      const { parsed, rawVisionResponse } = await parseReceiptWithVisionRetry(
        visionInput,
        visionOptions
      );
      const purchase = await parsedReceiptToPurchaseDraft(parsed);
      const validation = buildValidationReport(purchase);

      if (collectTimings) timings.ocrMs = Date.now() - visionStart;

      const validationGolden = stripValidatedPurchase(validation);
      const ocr = ocrDocumentFromRaw(parsed.rawText ?? purchase.merchant ?? "");
      emitter?.emit("onOCRFinished", { ocr, durationMs: timings.ocrMs ?? 0 });
      emitter?.emit("onPurchaseDraftCreated", { purchase, durationMs: 0 });
      emitter?.emit("onValidationFinished", {
        validation: validationGolden,
        purchase,
        durationMs: 0,
      });

      if (collectTimings) timings.totalMs = Date.now() - pipelineStart;

      const outputs = buildVisionOnlyQualityOutputs(
        purchase,
        validation,
        ocr,
        timings,
        config.defaultLayoutProfileId
      );
      const confidence = buildConfidenceModel(outputs);
      const debugReport = buildDebugReport(outputs, {
        receiptId: input.sourceHint ?? "vision",
      });

      return {
        ocr,
        purchase,
        validation: validationGolden,
        debugReport: config.modes.quality
          ? debugReport
          : { ...debugReport, confidence },
        confidence,
        performance: timings,
        rawVisionResponse,
      };
    } catch (visionError) {
      const message =
        visionError instanceof Error
          ? visionError.message
          : String(visionError);
      throw new Error(`vision_first parse failed: ${message}`, {
        cause: visionError,
      });
    }
  }

  if (config.parserMode === "vision_first" && input.imagePrimary?.dataUrl) {
    throw new Error(
      "vision_first requires an OpenAI API key for image parsing. " +
        "Legacy OCR/classifier pipeline (L2–L6) is disabled in vision_first mode."
    );
  }

  /** @deprecated Legacy L2–L6 path — only when parserMode is ocr_then_deterministic. */
  const deps = createDeps(config, ocrFactoryOptions);
  const layers = createDefaultLayerStack();
  const ctx = createLayerContext(deps);

  let layerStart = collectTimings ? Date.now() : 0;
  const l0 = await executeLayer(layers.l0, input, ctx);
  if (collectTimings) timings.uploadMs = Date.now() - layerStart;

  layerStart = collectTimings ? Date.now() : 0;
  const l1 = await executeLayer(layers.l1, l0.output, ctx);
  if (collectTimings) timings.ocrMs = Date.now() - layerStart;
  const ocr = l1.output;
  emitter?.emit("onOCRFinished", { ocr, durationMs: timings.ocrMs ?? 0 });

  const pipeline = await runParserStages(
    ocr,
    config.defaultLayoutProfileId,
    emitter,
    collectTimings
  );

  if (collectTimings) {
    timings.layoutMs = pipeline.timings.layoutMs;
    timings.graphMs = pipeline.timings.graphMs;
    timings.classificationMs = pipeline.timings.classificationMs;
    timings.blockMs = pipeline.timings.blockMs;
    timings.purchaseMs = pipeline.timings.purchaseMs;
    timings.validationMs = pipeline.timings.validationMs;
    timings.totalMs = Date.now() - pipelineStart;
  }

  const outputs = toQualityOutputs(ocr, pipeline, timings);
  const confidence = buildConfidenceModel(outputs);
  const boostedOverall = config.merchantProfiles.applyConfidenceBoost(
    confidence.overall,
    ocr.rawText
  );
  const confidenceWithBoost = { ...confidence, overall: boostedOverall };

  const debugReport = buildDebugReport(outputs, {
    receiptId: input.sourceHint ?? "sdk",
  });

  return {
    ocr,
    purchase: pipeline.purchase,
    validation: pipeline.validationGolden,
    debugReport: config.modes.quality
      ? debugReport
      : { ...debugReport, confidence: confidenceWithBoost },
    confidence: confidenceWithBoost,
    performance: timings,
  };
}

export { bufferToDataUrl, createDeps };
