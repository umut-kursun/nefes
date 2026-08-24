import { routeReceiptEngineAnalysis } from "@/lib/receipt-engine-v2-integration";
import type { ReceiptEngineV2Result } from "@/lib/receipt-engine-v2/engine/types";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { ReceiptStageTimings } from "@/lib/receipt-engine-debug/formatStageTimings";
import { arrayBufferToBase64 } from "@/lib/analyze-receipt-helpers";
import {
  mergeTimelines,
  type ScanTimeline,
  type ScanTimelinePayload,
} from "@/lib/receipt-scan-timeline";

export type ReceiptEngineAnalyzeSuccess = {
  purchase: PurchaseDraft;
  validation: ValidationReportGolden;
  imageDataUrl: string;
  /** Verbatim OCR text for review / detail UI. */
  ocrRawText: string;
  /** Exact vision model response before parser post-processing (debug). */
  rawVisionResponse?: string;
  /** Per-stage pipeline timings (ms). */
  performance: ReceiptStageTimings;
  /** Wall-clock scan timeline (t0–t9). */
  scanTimeline?: ScanTimelinePayload;
  /** V2 pipeline stage outputs for debug copy. */
  engineResult?: ReceiptEngineV2Result;
  engineUsed?: "v1" | "v2";
  engineFallback?: boolean;
};

export type ReceiptEngineAnalyzeFailure = {
  error: string;
  failureCode?: string;
  status: number;
};

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(bytes);
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

export async function analyzeReceiptEngineFormData(
  form: FormData,
  options: {
    apiKey: string;
    model?: string;
    /** Mutable — stamped t5–t7 during OpenAI fetch. */
    serverTimeline?: ScanTimeline;
    scanTraceId?: string;
  }
): Promise<ReceiptEngineAnalyzeSuccess | ReceiptEngineAnalyzeFailure> {
  const file = form.get("image");
  const altFile = form.get("imageAlt");
  const originalUrlField = form.get("originalDataUrl");
  const hint = String(form.get("sourceHint") || "receipt");
  const preprocessMsRaw = form.get("preprocessMs");
  const preprocessMs =
    typeof preprocessMsRaw === "string" && preprocessMsRaw.trim()
      ? Number(preprocessMsRaw)
      : undefined;
  const resizeMsRaw = form.get("resizeMs");
  const resizeMs =
    typeof resizeMsRaw === "string" && resizeMsRaw.trim()
      ? Number(resizeMsRaw)
      : undefined;
  const base64EncodeMsRaw = form.get("base64EncodeMs");
  let base64EncodeMs =
    typeof base64EncodeMsRaw === "string" && base64EncodeMsRaw.trim()
      ? Number(base64EncodeMsRaw)
      : undefined;

  const scanTraceId =
    options.scanTraceId ??
    (typeof form.get("scanTraceId") === "string"
      ? String(form.get("scanTraceId"))
      : undefined);

  let clientTimeline: ScanTimeline | undefined;
  const clientTimelineRaw = form.get("clientTimeline");
  if (typeof clientTimelineRaw === "string" && clientTimelineRaw.trim()) {
    try {
      clientTimeline = JSON.parse(clientTimelineRaw) as ScanTimeline;
    } catch {
      clientTimeline = undefined;
    }
  }

  const serverTimeline = options.serverTimeline ?? {};

  if (!(file instanceof File)) {
    return { error: "Görsel gerekli.", status: 400 };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: "Görsel 10MB'dan küçük olmalı.", status: 400 };
  }

  const encodeStart = Date.now();
  const primaryDataUrl = await fileToDataUrl(file);
  const serverEncodeMs = Date.now() - encodeStart;
  base64EncodeMs = (base64EncodeMs ?? 0) + serverEncodeMs;
  const displayDataUrl =
    typeof originalUrlField === "string" && originalUrlField.startsWith("data:")
      ? originalUrlField
      : primaryDataUrl;

  let altImageDataUrl: string | undefined;
  if (altFile instanceof File && altFile.size <= 10 * 1024 * 1024) {
    const altEncodeStart = Date.now();
    altImageDataUrl = await fileToDataUrl(altFile);
    base64EncodeMs = (base64EncodeMs ?? 0) + (Date.now() - altEncodeStart);
  }

  const parserMode =
    process.env.RECEIPT_PARSER_MODE === "ocr_then_deterministic"
      ? "ocr_then_deterministic"
      : "vision_first";

  const result = await routeReceiptEngineAnalysis({
    imageDataUrl: primaryDataUrl,
    altImageDataUrl,
    sourceHint: hint,
    preprocessMs: Number.isFinite(preprocessMs) ? preprocessMs : undefined,
    resizeMs: Number.isFinite(resizeMs) ? resizeMs : undefined,
    base64EncodeMs: Number.isFinite(base64EncodeMs) ? base64EncodeMs : undefined,
    apiKey: options.apiKey,
    model: options.model ?? process.env.OPENAI_OCR_MODEL ?? "gpt-4o-mini",
    parserMode,
    scanTimeline: serverTimeline,
  });

  if ("error" in result) {
    return {
      error: result.error,
      failureCode: result.failureCode,
      status: 500,
    };
  }

  return {
    purchase: result.purchase,
    validation: result.validation,
    imageDataUrl: displayDataUrl,
    ocrRawText: result.ocrRawText,
    rawVisionResponse: result.rawVisionResponse,
    performance: result.performance,
    engineResult: result.engineResult,
    engineUsed: result.engineUsed,
    engineFallback: result.engineFallback,
    scanTimeline:
      scanTraceId != null
        ? mergeTimelines(scanTraceId, clientTimeline, serverTimeline)
        : undefined,
  };
}
