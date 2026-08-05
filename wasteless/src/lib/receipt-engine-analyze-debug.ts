import { arrayBufferToBase64 } from "@/lib/analyze-receipt-helpers";
import { analyzeReceipt } from "@/lib/receipt-engine-sdk";
import { stripValidatedPurchase } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import {
  createTraceDependencies,
  traceReceiptEngine,
  type OcrDebugCapture,
} from "@/lib/receipt-engine-debug/tracePipeline";
import {
  buildReceiptDebugExport,
  buildVisionFirstDebugExport,
} from "@/lib/receipt-engine-debug/buildExport";
import type { ReceiptDebugExport } from "@/lib/receipt-engine-debug/exportSchema";
import { readImageDimensions } from "@/lib/receipt-engine-debug/imageDimensions";
import type {
  ReceiptEngineAnalyzeFailure,
  ReceiptEngineAnalyzeSuccess,
} from "@/lib/receipt-engine-analyze";
import {
  mergeTimelines,
  type ScanTimeline,
} from "@/lib/receipt-scan-timeline";

export type ReceiptEngineAnalyzeWithDebugSuccess = ReceiptEngineAnalyzeSuccess & {
  debugExport: ReceiptDebugExport;
};

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(bytes);
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

function resolveOcrModel(options: { model?: string }): string {
  return (
    options.model ??
    process.env.OPENAI_VISION_MODEL ??
    process.env.OPENAI_OCR_MODEL ??
    "gpt-4o-mini"
  );
}

function resolveParserMode():
  | "ocr_then_deterministic"
  | "vision_first" {
  return process.env.RECEIPT_PARSER_MODE === "ocr_then_deterministic"
    ? "ocr_then_deterministic"
    : "vision_first";
}

export async function analyzeReceiptEngineWithDebug(
  form: FormData,
  options: {
    apiKey: string;
    model?: string;
    serverTimeline?: ScanTimeline;
    scanTraceId?: string;
  }
): Promise<
  ReceiptEngineAnalyzeWithDebugSuccess | ReceiptEngineAnalyzeFailure
> {
  const file = form.get("image");
  const altFile = form.get("imageAlt");
  const originalUrlField = form.get("originalDataUrl");
  const hint = String(form.get("sourceHint") || "receipt");
  const preprocessMsRaw = form.get("preprocessMs");
  const preprocessMs =
    typeof preprocessMsRaw === "string" && preprocessMsRaw.trim()
      ? Number(preprocessMsRaw)
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

  const primaryDataUrl = await fileToDataUrl(file);
  const displayDataUrl =
    typeof originalUrlField === "string" && originalUrlField.startsWith("data:")
      ? originalUrlField
      : primaryDataUrl;

  let altImageDataUrl: string | undefined;
  if (altFile instanceof File && altFile.size <= 10 * 1024 * 1024) {
    altImageDataUrl = await fileToDataUrl(altFile);
  }

  const ocrModel = resolveOcrModel(options);
  const parserMode = resolveParserMode();

  const displayFile =
    typeof originalUrlField === "string" && originalUrlField.startsWith("data:")
      ? null
      : file;
  const dimensionSource =
    displayFile ?? (await dataUrlToFile(displayDataUrl, "receipt.jpg"));
  const dimensionBytes = new Uint8Array(await dimensionSource.arrayBuffer());
  const decoded = readImageDimensions(dimensionBytes);
  const imageMeta = {
    width: decoded?.width ?? 0,
    height: decoded?.height ?? 0,
    sizeBytes: dimensionSource.size,
  };

  try {
    if (parserMode === "vision_first") {
      const t0 = Date.now();
      const result = await analyzeReceipt(
        {
          imageDataUrl: primaryDataUrl,
          altImageDataUrl,
          sourceHint: hint,
          preprocessMs: Number.isFinite(preprocessMs) ? preprocessMs : undefined,
        },
        {
          debug: true,
          ocrProviderId: "openai",
          parserMode: "vision_first",
        },
        {
          ocrFactoryOptions: {
            kind: "openai",
            openAi: {
              apiKey: options.apiKey,
              model: ocrModel,
            },
          },
          scanTimeline: serverTimeline,
        }
      );

      if (!result.success) {
        return {
          error: result.error?.message ?? "Receipt analysis failed.",
          status: 500,
        };
      }

      const validation = stripValidatedPurchase({
        ...result.validation,
        validatedPurchase: result.purchase,
      });
      const ocrRawText = result.rawOcr.rawText;
      const rawVisionResponse = result.rawVisionResponse;

      const debugExport = buildVisionFirstDebugExport({
        purchase: result.purchase,
        validation,
        rawOcrText: ocrRawText,
        rawVisionResponse: rawVisionResponse ?? "",
        imageMeta,
        ocrModel,
        ocrDurationMs: result.performance.ocrMs ?? Date.now() - t0,
      });

      return {
        purchase: result.purchase,
        validation,
        imageDataUrl: displayDataUrl,
        debugExport,
        ocrRawText,
        rawVisionResponse,
        performance: result.performance ?? {},
        scanTimeline:
          scanTraceId != null
            ? mergeTimelines(scanTraceId, clientTimeline, serverTimeline)
            : undefined,
      };
    }

    const ocrCapture: OcrDebugCapture = {};
    const deps = createTraceDependencies({ ...options, model: ocrModel }, ocrCapture);

    const trace = await traceReceiptEngine(
      {
        imagePrimary: {
          dataUrl: primaryDataUrl,
          variant: "enhanced",
          preprocessMs: Number.isFinite(preprocessMs) ? preprocessMs : undefined,
          width: decoded?.width,
          height: decoded?.height,
        },
        imageAlt: altImageDataUrl
          ? { dataUrl: altImageDataUrl, variant: "threshold" }
          : undefined,
        sourceHint: hint,
        imageDataUrl: displayDataUrl,
      },
      deps
    );

    const purchase = trace.stages.purchaseDraft as PurchaseDraft;
    const validation = trace.stages.validationReport as ValidationReportGolden;

    const debugExport = buildReceiptDebugExport({
      trace,
      imageMeta,
      ocrProvider: deps.ocrProvider.kind,
      ocrModel,
      ocrDurationMs: trace.timings.ocrMs,
      ocrCapture,
    });

    const ocrRawText =
      debugExport.ocr?.rawText?.trim() ||
      purchase.provenance.rawTexts.filter(Boolean).join("\n") ||
      "";

    return {
      purchase,
      validation,
      imageDataUrl: displayDataUrl,
      debugExport,
      ocrRawText,
      rawVisionResponse: ocrCapture.rawVisionResponse,
      performance: trace.timings,
      scanTimeline:
        scanTraceId != null
          ? mergeTimelines(scanTraceId, clientTimeline, serverTimeline)
          : undefined,
    };
  } catch (cause) {
    return {
      error:
        cause instanceof Error
          ? cause.message
          : "Receipt Engine analizi başarısız.",
      status: 500,
    };
  }
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid data URL for image dimensions.");
  }
  const mime = match[1];
  const bytes = Buffer.from(match[2], "base64");
  return new File([bytes], filename, { type: mime });
}

