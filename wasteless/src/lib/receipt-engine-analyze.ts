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

  if (!(file instanceof File)) {
    return { error: "Görsel gerekli.", status: 400 };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: "Görsel 10MB'dan küçük olmalı.", status: 400 };
  }

  const primaryDataUrl = await fileToDataUrl(file);
  const displayDataUrl =
    typeof originalUrlField === "string" && originalUrlField.startsWith("data:")
      ? originalUrlField
      : primaryDataUrl;

  let altImageDataUrl: string | undefined;
  if (altFile instanceof File && altFile.size <= 10 * 1024 * 1024) {
    altImageDataUrl = await fileToDataUrl(altFile);
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
