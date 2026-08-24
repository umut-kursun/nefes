import fs from "node:fs";
import path from "node:path";
import { buildValidationReport } from "@/lib/receipt-engine/layer-7-validate/buildValidationReport";
import { runReceiptEngineV2 } from "@/lib/receipt-engine-v2/engine/runReceiptEngineV2";
import type { VisionMerchant, VisionMetadata, VisionResult } from "@/lib/receipt-engine-v2/vision/types";
import { v2PurchaseToPurchaseDraft } from "@/lib/receipt-engine-v2-integration/v2PurchaseToPurchaseDraft";
import { purchaseDraftToExpenseDraft } from "@/lib/expense-factory";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { AnalysisStatus } from "@/lib/receipt-engine/types/models/validation";
import type { CorpusReceiptId, ReceiptPipelineSnapshot } from "./types";

const BASELINE_DIR = path.join(process.cwd(), "baselines", "corpus-v0");

export type CachedLiveOcr = {
  readonly ocrRawText: string;
  readonly lines?: readonly string[] | null;
  readonly confidence?: number;
  readonly merchant?: VisionMerchant | null;
  readonly metadata?: VisionMetadata | null;
  readonly rawVisionResponse?: {
    readonly lines?: readonly string[];
    readonly rawText?: string;
    readonly merchant?: VisionMerchant;
    readonly metadata?: VisionMetadata;
  };
};

function resolveCachedLines(raw: CachedLiveOcr): readonly string[] {
  if (raw.lines?.length) return raw.lines;
  if (raw.rawVisionResponse?.lines?.length) return raw.rawVisionResponse.lines;
  const text = raw.ocrRawText?.trim();
  if (text) {
    return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  }
  return [];
}

export function loadCachedLiveOcr(id: CorpusReceiptId): CachedLiveOcr {
  const filePath = path.join(BASELINE_DIR, "receipts", id, "live-ocr.json");
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as CachedLiveOcr;
  const lines = resolveCachedLines(raw);
  if (!lines.length) {
    throw new Error(`live-ocr.json for ${id} has no lines`);
  }
  return { ...raw, lines };
}

export function visionFromCachedOcr(cached: CachedLiveOcr): VisionResult {
  const merchant =
    cached.merchant ?? cached.rawVisionResponse?.merchant ?? undefined;
  const metadata =
    cached.metadata ?? cached.rawVisionResponse?.metadata ?? undefined;

  return {
    rawText: cached.ocrRawText,
    lines: [...(cached.lines?.length ? cached.lines : resolveCachedLines(cached))],
    confidence: cached.confidence ?? 0.55,
    ...(merchant ? { merchant } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

export function runTierAReplay(id: CorpusReceiptId): {
  snapshot: ReceiptPipelineSnapshot;
  purchase: PurchaseDraft;
} {
  const start = Date.now();
  const cached = loadCachedLiveOcr(id);
  const vision = visionFromCachedOcr(cached);

  const engineStart = Date.now();
  const engineResult = runReceiptEngineV2(vision);
  const extractionMs = Date.now() - engineStart;

  const purchaseStart = Date.now();
  const purchase = v2PurchaseToPurchaseDraft(
    engineResult.purchase,
    engineResult.rawVision,
    engineResult.receiptDocument
  );
  const validationStart = Date.now();
  const validation = buildValidationReport(purchase);
  const validationMs = Date.now() - validationStart;
  const purchaseDraftMs = Date.now() - purchaseStart - validationMs;

  const categories = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  const expense = purchaseDraftToExpenseDraft(purchase, {
    ocrRawText: vision.rawText,
    categories,
  });

  const snapshot = pipelineSnapshotFromDraft(id, purchase, expense, validation.analysisStatus, {
    totalMs: Date.now() - start,
    extractionMs,
    validationMs,
    purchaseDraftMs,
    ocrMs: 0,
    engineUsed: "v2-replay",
    engineFallback: false,
    tier: "tier-a-replay",
    validationErrorCodes: validation.errors.map((e) => e.code),
  });

  return { snapshot, purchase };
}

export type FrozenBaselineSummary = {
  readonly id: string;
  readonly name: string;
  readonly merchant: string;
  readonly total: number;
  readonly category: string;
  readonly productNames: string[];
  readonly paymentAmounts: number[];
  readonly analysisStatus: AnalysisStatus;
  readonly timings: { readonly totalMs: number; readonly ocrMs?: number };
};

export function loadFrozenBaselineSummary(id: CorpusReceiptId): FrozenBaselineSummary {
  const filePath = path.join(BASELINE_DIR, "receipts", id, "summary.json");
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as FrozenBaselineSummary;
}

export function loadFrozenPurchaseDraft(id: CorpusReceiptId): PurchaseDraft {
  const filePath = path.join(BASELINE_DIR, "receipts", id, "purchase-draft.json");
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as PurchaseDraft;
}

export function runFrozenBaselineSnapshot(id: CorpusReceiptId): ReceiptPipelineSnapshot {
  const summary = loadFrozenBaselineSummary(id);
  const purchase = loadFrozenPurchaseDraft(id);
  const categories = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  const expense = purchaseDraftToExpenseDraft(purchase, {
    categories,
    ocrRawText: "",
  });

  return pipelineSnapshotFromDraft(
    id,
    purchase,
    expense,
    summary.analysisStatus as AnalysisStatus,
    {
      totalMs: summary.timings.totalMs,
      ocrMs: summary.timings.ocrMs,
      engineUsed: "frozen-baseline",
      engineFallback: false,
      tier: "frozen-baseline",
      validationErrorCodes: [],
    }
  );
}

function pipelineSnapshotFromDraft(
  id: CorpusReceiptId,
  purchase: PurchaseDraft,
  expense: ReturnType<typeof purchaseDraftToExpenseDraft>,
  analysisStatus: AnalysisStatus,
  meta: {
    totalMs: number;
    ocrMs?: number;
    extractionMs?: number;
    validationMs?: number;
    purchaseDraftMs?: number;
    engineUsed?: string;
    engineFallback?: boolean;
    tier: ReceiptPipelineSnapshot["tier"];
    validationErrorCodes: readonly string[];
  }
): ReceiptPipelineSnapshot {
  return {
    id,
    merchant: purchase.merchant,
    categoryId: expense.category,
    date: purchase.purchaseDate?.normalized ?? purchase.purchaseDate?.raw ?? null,
    time: purchase.purchaseTime?.normalized ?? purchase.purchaseTime?.raw ?? null,
    total: purchase.total?.amount ?? null,
    productNames: purchase.products.map((p) => p.name),
    productLineTotals: purchase.products.map((p) => p.lineTotal ?? null),
    paymentAmounts: purchase.payments.map((p) => p.amount),
    fuel: expense.fuel
      ? {
          fuelType: expense.fuel.fuelType,
          liters: expense.fuel.liters,
          pricePerLiter: expense.fuel.pricePerLiter,
          plate: expense.fuel.plate,
        }
      : null,
    analysisStatus,
    validationErrorCodes: meta.validationErrorCodes,
    timings: {
      totalMs: meta.totalMs,
      ocrMs: meta.ocrMs,
      extractionMs: meta.extractionMs,
      validationMs: meta.validationMs,
      purchaseDraftMs: meta.purchaseDraftMs,
      engineUsed: meta.engineUsed,
      engineFallback: meta.engineFallback,
    },
    tier: meta.tier,
  };
}

export function pipelineSnapshotFromDraftBundle(params: {
  id: CorpusReceiptId;
  purchase: PurchaseDraft;
  expense: ReturnType<typeof purchaseDraftToExpenseDraft>;
  analysisStatus: AnalysisStatus;
  validationErrorCodes: readonly string[];
  timings: ReceiptPipelineSnapshot["timings"];
  tier: ReceiptPipelineSnapshot["tier"];
}): ReceiptPipelineSnapshot {
  return pipelineSnapshotFromDraft(
    params.id,
    params.purchase,
    params.expense,
    params.analysisStatus,
    {
      totalMs: params.timings.totalMs,
      ocrMs: params.timings.ocrMs,
      extractionMs: params.timings.extractionMs,
      validationMs: params.timings.validationMs,
      purchaseDraftMs: params.timings.purchaseDraftMs,
      engineUsed: params.timings.engineUsed,
      engineFallback: params.timings.engineFallback,
      tier: params.tier,
      validationErrorCodes: params.validationErrorCodes,
    }
  );
}
