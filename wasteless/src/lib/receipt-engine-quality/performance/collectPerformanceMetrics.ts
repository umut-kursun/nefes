import type { PipelineLayerTimings } from "@/lib/receipt-engine-debug/tracePipeline";
import type { PerformanceMetrics, StagePerformanceStats } from "../types";

const STAGE_KEYS: readonly (keyof PipelineLayerTimings)[] = [
  "layoutMs",
  "graphMs",
  "classificationMs",
  "blockMs",
  "purchaseMs",
  "validationMs",
  "totalMs",
];

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))] ?? 0;
}

function computeStats(values: readonly number[]): StagePerformanceStats {
  if (values.length === 0) {
    return { avgMs: 0, medianMs: 0, p95Ms: 0, sampleCount: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mid = Math.floor(sorted.length / 2);
  const medianMs =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : (sorted[mid] ?? 0);

  return {
    avgMs: sum / sorted.length,
    medianMs,
    p95Ms: percentile(sorted, 95),
    sampleCount: sorted.length,
  };
}

/** Collect avg/median/p95 performance metrics from pipeline timings. */
export function collectPerformanceMetrics(
  timingsList: readonly Partial<PipelineLayerTimings>[]
): PerformanceMetrics {
  const stages: Record<string, StagePerformanceStats> = {};

  for (const key of STAGE_KEYS) {
    const values = timingsList
      .map((t) => t[key])
      .filter((v): v is number => typeof v === "number");
    stages[key] = computeStats(values);
  }

  return {
    generatedAt: new Date().toISOString(),
    receiptCount: timingsList.length,
    stages,
    total: stages.totalMs ?? computeStats([]),
  };
}
