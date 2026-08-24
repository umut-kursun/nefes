import { analyzeReceipt } from "@/lib/receipt-engine-sdk";
import { stripValidatedPurchase } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ReceiptStageTimings } from "@/lib/receipt-engine-debug/formatStageTimings";
import type { ScanTimeline } from "@/lib/receipt-scan-timeline";
import type { ReceiptEngineV2Result } from "@/lib/receipt-engine-v2/engine/types";
import {
  isReceiptEngineV2Enabled,
  type ReceiptEngineVersion,
} from "./config";
import {
  runReceiptEngineV2Production,
  V2_VALIDATION_FALLBACK_THRESHOLD,
} from "./runReceiptEngineV2Production";

export type ReceiptEngineRouterInput = {
  readonly imageDataUrl: string;
  readonly altImageDataUrl?: string;
  readonly sourceHint?: string;
  readonly preprocessMs?: number;
  readonly resizeMs?: number;
  readonly base64EncodeMs?: number;
  readonly apiKey: string;
  readonly model?: string;
  readonly parserMode?: "ocr_then_deterministic" | "vision_first";
  readonly scanTimeline?: ScanTimeline;
};

export type ReceiptEngineRouterSuccess = {
  readonly purchase: PurchaseDraft;
  readonly validation: ValidationReportGolden;
  readonly ocrRawText: string;
  readonly rawVisionResponse?: string;
  readonly performance: ReceiptStageTimings;
  readonly engineUsed: ReceiptEngineVersion;
  readonly engineFallback: boolean;
  readonly engineResult?: ReceiptEngineV2Result;
};

export type ReceiptEngineRouterFailure = {
  readonly error: string;
  readonly failureCode?: string;
};

function logEngineSelection(
  engineUsed: ReceiptEngineVersion,
  engineFallback: boolean,
  sourceHint?: string
): void {
  const suffix = engineFallback ? " (fallback from v2)" : "";
  console.info(
    `[receipt-engine] processed receipt with engine=${engineUsed}${suffix}` +
      (sourceHint ? ` sourceHint=${sourceHint}` : "")
  );
}

async function runReceiptEngineV1(
  input: ReceiptEngineRouterInput
): Promise<ReceiptEngineRouterSuccess | ReceiptEngineRouterFailure> {
  const parserMode =
    input.parserMode ??
    (process.env.RECEIPT_PARSER_MODE === "ocr_then_deterministic"
      ? "ocr_then_deterministic"
      : "vision_first");

  const result = await analyzeReceipt(
    {
      imageDataUrl: input.imageDataUrl,
      altImageDataUrl: input.altImageDataUrl,
      sourceHint: input.sourceHint ?? "receipt",
      preprocessMs: input.preprocessMs,
      resizeMs: input.resizeMs,
      base64EncodeMs: input.base64EncodeMs,
    },
    {
      debug: process.env.NODE_ENV === "development",
      ocrProviderId: "openai",
      parserMode,
    },
    {
      ocrFactoryOptions: {
        kind: "openai",
        openAi: {
          apiKey: input.apiKey,
          model: input.model ?? process.env.OPENAI_OCR_MODEL ?? "gpt-4o-mini",
        },
      },
      scanTimeline: input.scanTimeline,
    }
  );

  if (!result.success) {
    return {
      error: result.error?.message ?? "Receipt analysis failed.",
      failureCode: result.error?.code,
    };
  }

  return {
    purchase: result.purchase,
    validation: stripValidatedPurchase({
      ...result.validation,
      validatedPurchase: result.purchase,
    }),
    ocrRawText: result.rawOcr.rawText,
    rawVisionResponse: result.rawVisionResponse,
    performance: {
      ...(result.performance ?? {}),
      engine: "v1",
    },
    engineUsed: "v1",
    engineFallback: false,
  };
}

/**
 * Route receipt analysis through V2 when enabled, with automatic V1 fallback on error.
 */
export async function routeReceiptEngineAnalysis(
  input: ReceiptEngineRouterInput
): Promise<ReceiptEngineRouterSuccess | ReceiptEngineRouterFailure> {
  if (!isReceiptEngineV2Enabled()) {
    const v1 = await runReceiptEngineV1(input);
    if ("error" in v1) return v1;
    logEngineSelection("v1", false, input.sourceHint);
    return v1;
  }

  try {
    const v2 = await runReceiptEngineV2Production({
      imageDataUrl: input.imageDataUrl,
      altImageDataUrl: input.altImageDataUrl,
      apiKey: input.apiKey,
      model: input.model,
      scanTimeline: input.scanTimeline,
    });

    if (v2.validation.score < V2_VALIDATION_FALLBACK_THRESHOLD) {
      console.warn(
        `[receipt-engine] V2 validation score ${v2.validation.score} below ${V2_VALIDATION_FALLBACK_THRESHOLD}; trying V1 fallback`
      );

      const v1 = await runReceiptEngineV1(input);
      if (!("error" in v1) && v1.validation.score > v2.validation.score) {
        logEngineSelection("v1", true, input.sourceHint);
        return {
          ...v1,
          engineFallback: true,
          ocrRawText: v2.ocrRawText,
          rawVisionResponse: v2.rawVisionResponse,
          performance: {
            ...v1.performance,
            engine: "v1",
            ocrMs: v2.performance.ocrMs,
          },
        };
      }
    }

    logEngineSelection("v2", false, input.sourceHint);

    return {
      purchase: v2.purchase,
      validation: v2.validation,
      ocrRawText: v2.ocrRawText,
      rawVisionResponse: v2.rawVisionResponse,
      performance: v2.performance,
      engineUsed: "v2",
      engineFallback: false,
      engineResult: v2.engineResult,
    };
  } catch (cause) {
    console.warn(
      "[receipt-engine] V2 pipeline failed; falling back to V1",
      cause instanceof Error ? cause.message : cause
    );

    const v1 = await runReceiptEngineV1(input);
    if ("error" in v1) return v1;

    logEngineSelection("v1", true, input.sourceHint);

    return {
      ...v1,
      engineFallback: true,
    };
  }
}
