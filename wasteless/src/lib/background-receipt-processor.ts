import { purchaseDraftToExpenseDraft } from "@/lib/expense-factory";

import { triggerHaptic } from "@/lib/haptics";

import {

  fileToDataUrl,

  HIGH_RES_MAX_EDGE,

  preprocessReceiptImage,

  shouldRetryWithHigherResolution,

} from "@/lib/receipt-image-preprocess";

import { saveExpense } from "@/lib/db";

import type { Expense, UserCategory } from "@/lib/types";

import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";

import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";

import { createId, todayISO } from "@/lib/utils";

import {
  createScanTraceId,
  logScanTimelineReport,
  stampTimeline,
  type ScanTimeline,
  type ScanTimelinePayload,
} from "@/lib/receipt-scan-timeline";



export function createProcessingReceiptExpense(

  imageDataUrl: string,

  id = createId("exp")

): Expense {

  const now = new Date().toISOString();

  return {

    id,

    sourceType: "receipt",

    parseStatus: "processing",

    date: todayISO(),

    time: null,

    merchantName: "İşleniyor…",

    merchantRaw: null,

    category: "market",

    subcategory: null,

    tagIds: [],

    totalAmount: 0,

    currency: "TRY",

    notes: null,

    createdAt: now,

    updatedAt: now,

    rawText: null,

    confidence: null,

    imageDataUrl,

    aiResponseJson: null,

    fuel: null,

    packCount: null,

    quickButtonId: null,

    items: [],

    charges: [],

    discounts: [],

    payments: [],

    unknownLines: [],

  };

}



export interface BackgroundReceiptJob {

  readonly expenseId: string;

  readonly file: File;

  readonly imageDataUrl: string;

  readonly categories: UserCategory[];

  readonly onUpdate: (expense: Expense) => void | Promise<void>;

  readonly onSuccess: (expense: Expense) => void;

  readonly onError: (message: string) => void;

  readonly scanTraceId?: string;

  readonly clientTimeline?: ScanTimeline;

}



async function analyzePreprocessedImages(

  enhanced: Blob,

  threshold: Blob,

  originalDataUrl: string,

  preprocessMs: number,

  resizeMs: number,

  base64EncodeMs: number,

  scanTraceId: string,

  clientTimeline: ScanTimeline

): Promise<{
  purchase: PurchaseDraft;
  validation: ValidationReportGolden;
  ocrRawText: string;
  rawVisionResponse?: string;
  imageDataUrl: string;
  performance: import("@/lib/receipt-engine-debug/formatStageTimings").ReceiptStageTimings;
  scanTimeline?: ScanTimelinePayload;
}> {

  const body = new FormData();

  body.append(

    "image",

    new File([enhanced], "receipt-enhanced.jpg", { type: "image/jpeg" })

  );

  body.append(

    "imageAlt",

    new File([threshold], "receipt-threshold.jpg", {

      type: "image/jpeg",

    })

  );

  body.append("originalDataUrl", originalDataUrl);

  body.append("sourceHint", "receipt");

  body.append("preprocessMs", String(preprocessMs));

  body.append("resizeMs", String(resizeMs));

  body.append("base64EncodeMs", String(base64EncodeMs));

  body.append("scanTraceId", scanTraceId);

  body.append("clientTimeline", JSON.stringify(clientTimeline));

  stampTimeline(clientTimeline, "t3_fetch_start");

  const res = await fetch("/api/receipt-engine", { method: "POST", body });
  const fetchEnd = Date.now();
  stampTimeline(clientTimeline, "t9_browser_response_received");

  const json = await res.json();

  if (!res.ok) {

    throw new Error(json.error || "Receipt Engine analizi başarısız");

  }

  const scanTimeline =
    json.scanTimeline && typeof json.scanTimeline === "object"
      ? (json.scanTimeline as ScanTimelinePayload)
      : undefined;

  if (scanTimeline) {
    const merged = {
      ...scanTimeline.merged,
      t9_browser_response_received: clientTimeline.t9_browser_response_received,
    };
    const payload: ScanTimelinePayload = { ...scanTimeline, merged };
    logScanTimelineReport(payload);
  }

  const networkMs = fetchEnd - (clientTimeline.t3_fetch_start ?? fetchEnd);

  return {

    purchase: json.purchase as PurchaseDraft,

    validation: json.validation as ValidationReportGolden,

    ocrRawText: typeof json.ocrRawText === "string" ? json.ocrRawText : "",

    rawVisionResponse:
      typeof json.rawVisionResponse === "string"
        ? json.rawVisionResponse
        : undefined,

    imageDataUrl:

      typeof json.imageDataUrl === "string" ? json.imageDataUrl : originalDataUrl,

    performance: {
      ...(json.performance && typeof json.performance === "object"
        ? (json.performance as import("@/lib/receipt-engine-debug/formatStageTimings").ReceiptStageTimings)
        : {}),
      networkMs,
    },

    scanTimeline,
  };
}



export async function runBackgroundReceiptParse(

  job: BackgroundReceiptJob

): Promise<void> {

  try {

    const pipelineStart = performance.now();

    const scanTraceId = job.scanTraceId ?? createScanTraceId();

    const clientTimeline: ScanTimeline = { ...job.clientTimeline };

    stampTimeline(clientTimeline, "t1_preprocess_start");

    const originalStart = performance.now();

    const originalDataUrl = await fileToDataUrl(job.file);

    const originalEncodeMs = Math.round(performance.now() - originalStart);

    const enhanced = await preprocessReceiptImage(job.file, "enhanced");

    const threshold = await preprocessReceiptImage(job.file, "threshold");

    stampTimeline(clientTimeline, "t2_preprocess_end");

    let preprocessMs = enhanced.timings.totalMs + threshold.timings.totalMs;

    let resizeMs = enhanced.timings.resizeMs + threshold.timings.resizeMs;

    let base64EncodeMs =
      enhanced.timings.base64EncodeMs +
      threshold.timings.base64EncodeMs +
      originalEncodeMs;



    let result = await analyzePreprocessedImages(

      enhanced.blob,

      threshold.blob,

      originalDataUrl,

      preprocessMs,

      resizeMs,

      base64EncodeMs,

      scanTraceId,

      clientTimeline

    );



    if (

      shouldRetryWithHigherResolution({

        validationScore: result.validation.score,

        consistent: result.validation.consistent,

        confidence: result.purchase.confidence,

      })

    ) {

      const enhancedHi = await preprocessReceiptImage(job.file, "enhanced", {

        maxEdge: HIGH_RES_MAX_EDGE,

      });

      const thresholdHi = await preprocessReceiptImage(job.file, "threshold", {

        maxEdge: HIGH_RES_MAX_EDGE,

      });

      preprocessMs += enhancedHi.timings.totalMs + thresholdHi.timings.totalMs;

      resizeMs += enhancedHi.timings.resizeMs + thresholdHi.timings.resizeMs;

      base64EncodeMs +=
        enhancedHi.timings.base64EncodeMs + thresholdHi.timings.base64EncodeMs;



      const retryResult = await analyzePreprocessedImages(

        enhancedHi.blob,

        thresholdHi.blob,

        originalDataUrl,

        preprocessMs,

        resizeMs,

        base64EncodeMs,

        scanTraceId,

        clientTimeline

      );



      if (retryResult.validation.score >= result.validation.score) {

        result = retryResult;

      }

    }



    const parsed = purchaseDraftToExpenseDraft(result.purchase, {

      imageDataUrl: result.imageDataUrl,

      ocrRawText: result.ocrRawText,

      categories: job.categories,

      parserJson: JSON.stringify(

        {
          purchase: result.purchase,
          validation: result.validation,
          rawVisionResponse: result.rawVisionResponse ?? null,
          performance: {
            ...result.performance,
            clientTotalMs: Math.round(performance.now() - pipelineStart),
          },
          scanTimeline: result.scanTimeline ?? null,
        },

        null,

        2

      ),

    });



    const pending: Expense = {

      ...parsed,

      id: job.expenseId,

      parseStatus: "pending_approval",

      updatedAt: new Date().toISOString(),

    };



    await saveExpense(pending);

    await job.onUpdate(pending);

    triggerHaptic("light");

    job.onSuccess(pending);

  } catch (err) {

    const message =

      err instanceof Error ? err.message : "Fiş işlenirken hata oluştu";

    const failed: Expense = {

      ...createProcessingReceiptExpense(job.imageDataUrl, job.expenseId),

      parseStatus: "failed",

      merchantName: "Fiş işlenemedi",

      notes: message,

      updatedAt: new Date().toISOString(),

    };

    await saveExpense(failed);

    await job.onUpdate(failed);

    job.onError(message);

  }

}

