import { emptyPurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import { resolveSdkConfig, type PartialSdkEngineConfig } from "./config/SdkEngineConfig";
import {
  createEventEmitter,
  type ReceiptEngineEventEmitter,
} from "./events/lifecycle";
import type { OcrProviderFactoryOptions } from "./ocr/ocrProviderRegistry";
import {
  bufferToDataUrl,
  orchestrateFromImage,
  orchestrateFromOcrText,
} from "./orchestratePipeline";
import type {
  ReceiptAnalyzeInput,
  ReceiptEngineSDKOptions,
  ReceiptResult,
} from "./types";
import { resolveVersionMetadata } from "./versioning/versions";

const EMPTY_PURCHASE = emptyPurchaseDraft();

function isOcrTextInput(
  input: ReceiptAnalyzeInput
): input is { ocrText: string; sourceHint?: string } {
  return "ocrText" in input;
}

function isImageBufferInput(
  input: ReceiptAnalyzeInput
): input is { imageBuffer: Buffer | Uint8Array; mimeType: string; sourceHint?: string } {
  return "imageBuffer" in input;
}

function buildOcrViews(ocr: {
  rawText: string;
  lines: readonly string[];
}) {
  return {
    rawOcr: {
      rawText: ocr.rawText,
      lines: [...ocr.lines],
    },
    normalizedOcr: {
      rawText: ocr.rawText,
      lines: [...ocr.lines],
    },
  };
}

function emptyFailureResult(
  error: { code: string; message: string },
  versions = resolveVersionMetadata()
): ReceiptResult {
  return {
    success: false,
    purchase: EMPTY_PURCHASE,
    validation: {
      isValid: false,
      consistent: false,
      score: 0,
      errors: [
        {
          id: "sdk-error",
          severity: "ERROR",
          category: "business",
          code: error.code,
          message: error.message,
          location: { path: "sdk" },
          provenance: {
            validatorId: "sdk",
            purchaseConfidence: 0,
          },
        },
      ],
      warnings: [],
      info: [],
      confidenceAdjustment: 0,
      overallConfidence: 0,
      provenance: {
        purchaseConfidence: 0,
        structuralValidators: [],
        businessValidators: [],
        issueCount: 1,
      },
      blocking: true,
    },
    debugReport: {
      receiptId: "error",
      generatedAt: new Date().toISOString(),
      sections: [],
      semanticLineTypes: [],
      parserStateTransitions: [],
      confidence: {
        merchant: 0,
        products: 0,
        payments: 0,
        vat: 0,
        totals: 0,
        fuel: 0,
        metadata: 0,
        layout: 0,
        classification: 0,
        blocks: 0,
        purchase: 0,
        validation: 0,
        overall: 0,
      },
      fieldExplanations: {
        merchant: null,
        products: [],
        payments: [],
        vat: [],
        totals: [],
        fuel: [],
        metadata: [],
      },
      validation: {
        isValid: false,
        score: 0,
        errorCount: 1,
        warningCount: 0,
        errors: [{ code: error.code, message: error.message }],
        warnings: [],
      },
      rejectedCandidates: [],
    },
    confidence: {
      merchant: 0,
      products: 0,
      payments: 0,
      vat: 0,
      totals: 0,
      fuel: 0,
      metadata: 0,
      layout: 0,
      classification: 0,
      blocks: 0,
      purchase: 0,
      validation: 0,
      overall: 0,
    },
    performance: {},
    rawOcr: { rawText: "", lines: [] },
    normalizedOcr: { rawText: "", lines: [] },
    versions,
    error,
  };
}

export type AnalyzeReceiptOptions = ReceiptEngineSDKOptions & {
  ocrFactoryOptions?: OcrProviderFactoryOptions;
};

/** Primary SDK entry — analyze a receipt from image or OCR text. */
export async function analyzeReceipt(
  input: ReceiptAnalyzeInput,
  config?: PartialSdkEngineConfig,
  options?: Omit<AnalyzeReceiptOptions, "config">
): Promise<ReceiptResult> {
  const resolvedConfig = resolveSdkConfig({
    ...config,
    parserMode:
      config?.parserMode ??
      (!isOcrTextInput(input) ? "vision_first" : undefined),
  });
  const emitter = options?.events ?? createEventEmitter();
  const versions = resolveVersionMetadata();

  try {
    let pipelineResult;

    if (isOcrTextInput(input)) {
      pipelineResult = await orchestrateFromOcrText(
        input.ocrText,
        resolvedConfig,
        emitter
      );
    } else {
      const imageDataUrl = isImageBufferInput(input)
        ? bufferToDataUrl(input.imageBuffer, input.mimeType)
        : input.imageDataUrl;

      const altImageDataUrl = isImageBufferInput(input)
        ? undefined
        : input.altImageDataUrl;

      pipelineResult = await orchestrateFromImage(
        {
          imagePrimary: {
            dataUrl: imageDataUrl,
            variant: "enhanced",
            preprocessMs: isImageBufferInput(input)
              ? undefined
              : input.preprocessMs,
            resizeMs: isImageBufferInput(input) ? undefined : input.resizeMs,
            base64EncodeMs: isImageBufferInput(input)
              ? undefined
              : input.base64EncodeMs,
          },
          imageAlt: altImageDataUrl
            ? { dataUrl: altImageDataUrl, variant: "threshold" }
            : undefined,
          sourceHint: input.sourceHint ?? "receipt",
          imageDataUrl,
        },
        resolvedConfig,
        options?.ocrFactoryOptions,
        emitter
      );
    }

    const ocrViews = buildOcrViews(pipelineResult.ocr);
    const result: ReceiptResult = {
      success: true,
      purchase: pipelineResult.purchase,
      validation: pipelineResult.validation,
      debugReport: pipelineResult.debugReport,
      confidence: pipelineResult.confidence,
      performance: pipelineResult.performance,
      ...ocrViews,
      rawVisionResponse:
        "rawVisionResponse" in pipelineResult
          ? pipelineResult.rawVisionResponse
          : undefined,
      versions,
    };

    emitter.emit("onCompleted", { result });
    return result;
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Receipt analysis failed.";
    const result = emptyFailureResult(
      { code: "ANALYSIS_FAILED", message },
      versions
    );
    emitter.emit("onCompleted", { result });
    return result;
  }
}

export function createReceiptEngine(
  config?: PartialSdkEngineConfig,
  options?: Omit<AnalyzeReceiptOptions, "config">
): ReceiptEngineSDK {
  return new ReceiptEngineSDK(config, options);
}

export class ReceiptEngineSDK {
  private readonly config: ReturnType<typeof resolveSdkConfig>;
  private readonly ocrFactoryOptions?: OcrProviderFactoryOptions;
  readonly events: ReceiptEngineEventEmitter;

  constructor(
    config?: PartialSdkEngineConfig,
    options?: Omit<AnalyzeReceiptOptions, "config" | "events">
  ) {
    this.config = resolveSdkConfig(config);
    this.ocrFactoryOptions = options?.ocrFactoryOptions;
    this.events = createEventEmitter();
  }

  getConfig(): ReturnType<typeof resolveSdkConfig> {
    return this.config;
  }

  analyze(input: ReceiptAnalyzeInput): Promise<ReceiptResult> {
    return analyzeReceipt(input, this.config, {
      events: this.events,
      ocrFactoryOptions: this.ocrFactoryOptions,
    });
  }
}
