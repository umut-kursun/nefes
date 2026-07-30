import { runRegressionBenchmark } from "@/lib/receipt-engine-quality/benchmark/runRegressionBenchmark";
import { REAL_RECEIPT_CATALOG } from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { resolveVersionMetadata } from "../versioning/versions";

export interface SdkBenchmarkMemoryEstimate {
  readonly heapUsedDeltaBytes: number;
  readonly rssDeltaBytes: number;
  readonly externalDeltaBytes: number;
}

export interface SdkBenchmarkReport {
  readonly generatedAt: string;
  readonly versions: ReturnType<typeof resolveVersionMetadata>;
  readonly corpusCoverage: {
    readonly total: number;
    readonly exercised: number;
    readonly coverageRate: number;
  };
  readonly passRate: number;
  readonly avgConfidence: number;
  readonly performance: {
    readonly avgMs: number;
    readonly medianMs: number;
    readonly p95Ms: number;
  };
  readonly memory: SdkBenchmarkMemoryEstimate;
  readonly regression: ReturnType<typeof runRegressionBenchmark>;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

/** Wrap receipt-engine-quality benchmark with SDK-level metrics. */
export function runSdkBenchmark(): SdkBenchmarkReport {
  const before = process.memoryUsage();
  const regression = runRegressionBenchmark();
  const after = process.memoryUsage();

  const totals = regression.receipts.map((r) => r.timings.totalMs ?? 0);

  return {
    generatedAt: new Date().toISOString(),
    versions: resolveVersionMetadata(),
    corpusCoverage: {
      total: REAL_RECEIPT_CATALOG.length,
      exercised: regression.receiptCount,
      coverageRate: regression.receiptCount / (REAL_RECEIPT_CATALOG.length || 1),
    },
    passRate: regression.passRate,
    avgConfidence: regression.avgConfidence,
    performance: {
      avgMs:
        totals.reduce((sum, value) => sum + value, 0) / (totals.length || 1),
      medianMs: percentile(totals, 50),
      p95Ms: percentile(totals, 95),
    },
    memory: {
      heapUsedDeltaBytes: after.heapUsed - before.heapUsed,
      rssDeltaBytes: after.rss - before.rss,
      externalDeltaBytes: after.external - before.external,
    },
    regression,
  };
}
