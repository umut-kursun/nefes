import { analyzeReceipt } from "@/lib/receipt-engine-sdk";
import { stripValidatedPurchase } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import { arrayBufferToBase64 } from "@/lib/analyze-receipt-helpers";

export type ReceiptEngineAnalyzeSuccess = {
  purchase: PurchaseDraft;
  validation: ValidationReportGolden;
  imageDataUrl: string;
  /** Verbatim OCR text for review / detail UI. */
  ocrRawText: string;
  /** Exact vision model response before parser post-processing (debug). */
  rawVisionResponse?: string;
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
  options: { apiKey: string; model?: string }
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

  const result = await analyzeReceipt(
    {
      imageDataUrl: primaryDataUrl,
      altImageDataUrl,
      sourceHint: hint,
      preprocessMs: Number.isFinite(preprocessMs) ? preprocessMs : undefined,
      resizeMs: Number.isFinite(resizeMs) ? resizeMs : undefined,
      base64EncodeMs: Number.isFinite(base64EncodeMs) ? base64EncodeMs : undefined,
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
          apiKey: options.apiKey,
          model: options.model ?? process.env.OPENAI_OCR_MODEL ?? "gpt-4o-mini",
        },
      },
    }
  );

  if (!result.success) {
    return {
      error: result.error?.message ?? "Receipt analysis failed.",
      failureCode: result.error?.code,
      status: 500,
    };
  }

  return {
    purchase: result.purchase,
    validation: stripValidatedPurchase({
      ...result.validation,
      validatedPurchase: result.purchase,
    }),
    imageDataUrl: displayDataUrl,
    ocrRawText: result.rawOcr.rawText,
    rawVisionResponse: result.rawVisionResponse,
  };
}
