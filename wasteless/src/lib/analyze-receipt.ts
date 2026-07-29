import type { AnalysisResult, OcrCorrection } from "@/lib/types";
import type { CatalogSnapshot } from "@/lib/product-knowledge/catalogSnapshot";
import { runReceiptPipeline } from "@/lib/receipt-pipeline";
import { arrayBufferToBase64 } from "@/lib/analyze-receipt-helpers";

export { extractJson, arrayBufferToBase64 } from "@/lib/analyze-receipt-helpers";

export type AnalyzeSuccess = {
  data: unknown;
  imageDataUrl: string;
  rawAiResponse: string;
  passes?: number;
  documentType?: string;
  stageLog?: unknown;
  debug?: unknown;
  intelligenceCorrections?: string[];
  correctionsApplied?: number;
};

export type AnalyzeFailure = {
  error: string;
  failureReason?: string;
  debug?: unknown;
  details?: unknown;
  raw?: unknown;
  status: number;
};

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(bytes);
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

function parseJsonField<T>(value: FormDataEntryValue | null): T | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export async function analyzeReceiptFormData(
  form: FormData,
  options: {
    apiKey: string;
    model?: string;
    fallbackModel?: string;
    catalogSnapshot?: CatalogSnapshot | null;
    catalogFallbackNote?: string;
  }
): Promise<AnalyzeSuccess | AnalyzeFailure> {
  const file = form.get("image");
  const altFile = form.get("imageAlt");
  const originalUrlField = form.get("originalDataUrl");
  const hint = String(form.get("sourceHint") || "auto");
  const learnedAliases =
    parseJsonField<Array<{ ocr: string; productId: string }>>(
      form.get("learnedAliases")
    ) ?? [];
  const corrections =
    parseJsonField<OcrCorrection[]>(form.get("corrections")) ?? [];
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

  const model = options.model || "gpt-4o-mini";
  const fallbackModel =
    options.fallbackModel ||
    process.env.OPENAI_VISION_FALLBACK_MODEL ||
    model;

  const result = await runReceiptPipeline({
    imageDataUrl: primaryDataUrl,
    altImageDataUrl,
    displayDataUrl,
    sourceHint: hint,
    apiKey: options.apiKey,
    model,
    fallbackModel,
    learnedAliases,
    corrections,
    preprocessMs: Number.isFinite(preprocessMs) ? preprocessMs : undefined,
    catalogSnapshot: options.catalogSnapshot ?? null,
    catalogFallbackNote: options.catalogFallbackNote,
  });

  if ("error" in result) {
    return {
      error: result.error,
      failureReason: result.failureReason,
      status: result.status,
      debug: result.debug,
      details: result.details,
      raw: result.raw,
    };
  }

  return {
    data: result.analysis as AnalysisResult,
    imageDataUrl: displayDataUrl,
    rawAiResponse: result.rawAiResponse,
    passes: result.passes,
    documentType: result.documentType,
    stageLog: result.stageLog,
    debug: result.debug,
    intelligenceCorrections: result.intelligenceCorrections,
    correctionsApplied: result.correctionsApplied,
  };
}
