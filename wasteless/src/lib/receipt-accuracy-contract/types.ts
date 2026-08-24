import type { AnalysisStatus } from "@/lib/receipt-engine/types/models/validation";

export type CorpusReceiptId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

export const CORPUS_RECEIPT_IDS: readonly CorpusReceiptId[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
] as const;

export type FieldVerdict = "correct" | "needs_review" | "incorrect";

export type ContractReport = {
  readonly id: CorpusReceiptId;
  readonly name: string;
  readonly merchant: FieldVerdict;
  readonly category: FieldVerdict;
  readonly date: FieldVerdict;
  readonly time: FieldVerdict;
  readonly total: FieldVerdict;
  readonly products: FieldVerdict;
  readonly payment: FieldVerdict;
  readonly analysisStatus: AnalysisStatus;
  readonly falseApproval: boolean;
  readonly notes: readonly string[];
};

export type PipelineTimings = {
  readonly totalMs: number;
  readonly ocrMs?: number;
  readonly extractionMs?: number;
  readonly validationMs?: number;
  readonly purchaseDraftMs?: number;
  readonly engineUsed?: string;
  readonly engineFallback?: boolean;
};

export type ReceiptPipelineSnapshot = {
  readonly id: CorpusReceiptId;
  readonly merchant: string | null;
  readonly categoryId: string;
  readonly date: string | null;
  readonly time: string | null;
  readonly total: number | null;
  readonly productNames: readonly string[];
  readonly productLineTotals: readonly (number | null)[];
  readonly paymentAmounts: readonly (number | undefined)[];
  readonly fuel?: {
    readonly fuelType: string | null;
    readonly liters: number | null;
    readonly pricePerLiter: number | null;
    readonly plate: string | null;
  } | null;
  readonly analysisStatus: AnalysisStatus;
  readonly validationErrorCodes: readonly string[];
  readonly timings: PipelineTimings;
  readonly tier: "frozen-baseline" | "tier-a-replay" | "tier-b-live";
};

export type CorpusScorecard = {
  readonly phase: string;
  readonly capturedAt: string;
  readonly tier: ReceiptPipelineSnapshot["tier"];
  readonly reports: readonly ContractReport[];
  readonly summary: {
    readonly merchant: { correct: number; needs_review: number; incorrect: number };
    readonly category: { correct: number; needs_review: number; incorrect: number };
    readonly date: { correct: number; needs_review: number; incorrect: number };
    readonly time: { correct: number; needs_review: number; incorrect: number };
    readonly total: { correct: number; needs_review: number; incorrect: number };
    readonly products: { correct: number; needs_review: number; incorrect: number };
    readonly payment: { correct: number; needs_review: number; incorrect: number };
    readonly falseApprovals: number;
  };
  readonly latency: {
    readonly p50Ms: number;
    readonly p95Ms: number;
    readonly maxMs: number;
    readonly samples: readonly { id: CorpusReceiptId; totalMs: number }[];
  };
};
