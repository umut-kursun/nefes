import { ocrDocumentFromRaw } from "@/lib/receipt-engine/fixtures/ocrFromRaw";
import { buildBlockDocument } from "@/lib/receipt-engine/layer-5-blocks/buildBlockDocument";
import { buildPurchaseDraft } from "@/lib/receipt-engine/layer-6-purchase/buildPurchaseDraft";
import { buildClassifiedGraph } from "@/lib/receipt-engine/layer-4-classify/buildClassifiedGraph";
import { buildReceiptGraph } from "@/lib/receipt-engine/layer-3-graph/buildReceiptGraph";
import { reconstructLayout } from "@/lib/receipt-engine/layer-2-layout/layoutReconstructor";
import { buildValidationReport } from "@/lib/receipt-engine/layer-7-validate/buildValidationReport";
import { runReceiptEngineV2 } from "../engine/runReceiptEngineV2";
import {
  buildVisionResult,
  loadAllGoldenReceipts,
  type GoldenReceipt,
} from "../tests/golden/GoldenReceipt";
import type { BenchmarkCategoryComparison, BenchmarkCategoryScore } from "./scoreCategory";
import {
  averageCategoryScore,
  compareCategoryScores,
  overallScore,
  scoreEngineAgainstGolden,
} from "./scoreCategory";
import {
  type BenchmarkEngineOutput,
  type BenchmarkRunMetrics,
  wrapV1Output,
  wrapV2Output,
} from "./normalizeOutputs";

export type BenchmarkReceiptResult = {
  readonly slug: string;
  readonly label: string;
  readonly category: string;
  readonly v1: BenchmarkEngineOutput;
  readonly v2: BenchmarkEngineOutput;
  readonly v1Scores: readonly BenchmarkCategoryScore[];
  readonly v2Scores: readonly BenchmarkCategoryScore[];
  readonly comparisons: readonly BenchmarkCategoryComparison[];
  readonly v1Overall: number;
  readonly v2Overall: number;
};

export type BenchmarkPerformanceSummary = {
  readonly v1TotalMs: number;
  readonly v2TotalMs: number;
  readonly v1AvgMs: number;
  readonly v2AvgMs: number;
  readonly v1PeakHeapDeltaBytes: number;
  readonly v2PeakHeapDeltaBytes: number;
  readonly v1AvgHeapDeltaBytes: number;
  readonly v2AvgHeapDeltaBytes: number;
  readonly fasterEngine: "v1" | "v2" | "same";
  readonly lowerMemoryEngine: "v1" | "v2" | "same";
};

export type BenchmarkReport = {
  readonly generatedAt: string;
  readonly receiptCount: number;
  readonly receipts: readonly BenchmarkReceiptResult[];
  readonly v1OverallScore: number;
  readonly v2OverallScore: number;
  readonly categoryComparisons: readonly BenchmarkCategoryComparison[];
  readonly performance: BenchmarkPerformanceSummary;
};

function measureRun<T>(fn: () => T): { result: T; metrics: BenchmarkRunMetrics } {
  if (globalThis.gc) {
    globalThis.gc();
  }

  const heapBefore = process.memoryUsage().heapUsed;
  const start = performance.now();
  const result = fn();
  const executionTimeMs = performance.now() - start;
  const heapAfter = process.memoryUsage().heapUsed;

  return {
    result,
    metrics: {
      executionTimeMs,
      memoryHeapDeltaBytes: Math.max(0, heapAfter - heapBefore),
    },
  };
}

function runV1Pipeline(ocrText: string) {
  const ocr = ocrDocumentFromRaw(ocrText);
  const layout = reconstructLayout(ocr, "generic-tr");
  const graph = buildReceiptGraph(layout);
  const classified = buildClassifiedGraph(graph);
  const blocks = buildBlockDocument(classified);
  const purchase = buildPurchaseDraft(blocks);
  const validation = buildValidationReport(purchase);
  return { purchase, validation };
}

function runV2Pipeline(receipt: GoldenReceipt) {
  return runReceiptEngineV2(buildVisionResult(receipt));
}

export function benchmarkGoldenReceipt(receipt: GoldenReceipt): BenchmarkReceiptResult {
  const ocrText = receipt.ocrLines.join("\n");

  const v1Run = measureRun(() => runV1Pipeline(ocrText));
  const v2Run = measureRun(() => runV2Pipeline(receipt));

  const v1 = wrapV1Output(v1Run.result.purchase, v1Run.result.validation, v1Run.metrics);
  const v2 = wrapV2Output(v2Run.result, v2Run.metrics);

  const v1Scores = scoreEngineAgainstGolden(v1, receipt.expected, v1Run.result.purchase);
  const v2Scores = scoreEngineAgainstGolden(v2, receipt.expected);
  const comparisons = compareCategoryScores(v1Scores, v2Scores);

  return {
    slug: receipt.meta.slug,
    label: receipt.meta.label,
    category: receipt.meta.category,
    v1,
    v2,
    v1Scores,
    v2Scores,
    comparisons,
    v1Overall: overallScore(v1Scores),
    v2Overall: overallScore(v2Scores),
  };
}

function summarizePerformance(
  receipts: readonly BenchmarkReceiptResult[]
): BenchmarkPerformanceSummary {
  const v1TotalMs = receipts.reduce((sum, r) => sum + r.v1.metrics.executionTimeMs, 0);
  const v2TotalMs = receipts.reduce((sum, r) => sum + r.v2.metrics.executionTimeMs, 0);
  const v1AvgMs = v1TotalMs / Math.max(receipts.length, 1);
  const v2AvgMs = v2TotalMs / Math.max(receipts.length, 1);

  const v1Heap = receipts.map((r) => r.v1.metrics.memoryHeapDeltaBytes);
  const v2Heap = receipts.map((r) => r.v2.metrics.memoryHeapDeltaBytes);

  const v1PeakHeapDeltaBytes = Math.max(...v1Heap, 0);
  const v2PeakHeapDeltaBytes = Math.max(...v2Heap, 0);
  const v1AvgHeapDeltaBytes =
    v1Heap.reduce((sum, value) => sum + value, 0) / Math.max(v1Heap.length, 1);
  const v2AvgHeapDeltaBytes =
    v2Heap.reduce((sum, value) => sum + value, 0) / Math.max(v2Heap.length, 1);

  let fasterEngine: BenchmarkPerformanceSummary["fasterEngine"] = "same";
  if (v1AvgMs + 0.5 < v2AvgMs) fasterEngine = "v1";
  else if (v2AvgMs + 0.5 < v1AvgMs) fasterEngine = "v2";

  let lowerMemoryEngine: BenchmarkPerformanceSummary["lowerMemoryEngine"] = "same";
  if (v1AvgHeapDeltaBytes + 1024 < v2AvgHeapDeltaBytes) lowerMemoryEngine = "v1";
  else if (v2AvgHeapDeltaBytes + 1024 < v1AvgHeapDeltaBytes) lowerMemoryEngine = "v2";

  return {
    v1TotalMs,
    v2TotalMs,
    v1AvgMs,
    v2AvgMs,
    v1PeakHeapDeltaBytes,
    v2PeakHeapDeltaBytes,
    v1AvgHeapDeltaBytes,
    v2AvgHeapDeltaBytes,
    fasterEngine,
    lowerMemoryEngine,
  };
}

function aggregateCategoryComparisons(
  receipts: readonly BenchmarkReceiptResult[]
): BenchmarkCategoryComparison[] {
  const categories = receipts[0]?.v1Scores.map((score) => score.category) ?? [];

  return categories.map((category) => {
    const v1Score = averageCategoryScore(receipts, category, "v1");
    const v2Score = averageCategoryScore(receipts, category, "v2");

    const roundedV1 = Math.round(v1Score * 10) / 10;
    const roundedV2 = Math.round(v2Score * 10) / 10;

    let rank: BenchmarkCategoryComparison["rank"] = "same";
    if (roundedV2 > roundedV1 + 0.05) rank = "better";
    else if (roundedV1 > roundedV2 + 0.05) rank = "worse";

    return {
      category,
      v1Score: roundedV1,
      v2Score: roundedV2,
      rank,
    };
  });
}

export function runBenchmark(
  receipts: readonly GoldenReceipt[] = loadAllGoldenReceipts()
): BenchmarkReport {
  const results = receipts.map((receipt) => benchmarkGoldenReceipt(receipt));
  const v1OverallScore = Math.round(
    results.reduce((sum, result) => sum + result.v1Overall, 0) / Math.max(results.length, 1)
  );
  const v2OverallScore = Math.round(
    results.reduce((sum, result) => sum + result.v2Overall, 0) / Math.max(results.length, 1)
  );

  return {
    generatedAt: new Date().toISOString(),
    receiptCount: results.length,
    receipts: results,
    v1OverallScore,
    v2OverallScore,
    categoryComparisons: aggregateCategoryComparisons(results),
    performance: summarizePerformance(results),
  };
}
