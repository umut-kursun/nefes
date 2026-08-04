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

}



async function analyzePreprocessedImages(

  enhanced: Blob,

  threshold: Blob,

  originalDataUrl: string,

  preprocessMs: number

): Promise<{

  purchase: PurchaseDraft;

  validation: ValidationReportGolden;

  ocrRawText: string;

  rawVisionResponse?: string;

  imageDataUrl: string;

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



  const res = await fetch("/api/receipt-engine", { method: "POST", body });

  const json = await res.json();

  if (!res.ok) {

    throw new Error(json.error || "Receipt Engine analizi başarısız");

  }



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

  };

}



export async function runBackgroundReceiptParse(

  job: BackgroundReceiptJob

): Promise<void> {

  try {

    const t0 = performance.now();

    const originalDataUrl = await fileToDataUrl(job.file);

    const enhanced = await preprocessReceiptImage(job.file, "enhanced");

    const threshold = await preprocessReceiptImage(job.file, "threshold");

    let preprocessMs = Math.round(performance.now() - t0);



    let result = await analyzePreprocessedImages(

      enhanced.blob,

      threshold.blob,

      originalDataUrl,

      preprocessMs

    );



    if (

      shouldRetryWithHigherResolution({

        validationScore: result.validation.score,

        consistent: result.validation.consistent,

        confidence: result.purchase.confidence,

      })

    ) {

      const tRetry = performance.now();

      const enhancedHi = await preprocessReceiptImage(job.file, "enhanced", {

        maxEdge: HIGH_RES_MAX_EDGE,

      });

      const thresholdHi = await preprocessReceiptImage(job.file, "threshold", {

        maxEdge: HIGH_RES_MAX_EDGE,

      });

      preprocessMs += Math.round(performance.now() - tRetry);



      const retryResult = await analyzePreprocessedImages(

        enhancedHi.blob,

        thresholdHi.blob,

        originalDataUrl,

        preprocessMs

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

