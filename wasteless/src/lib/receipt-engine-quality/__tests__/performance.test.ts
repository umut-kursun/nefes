import { describe, expect, it } from "vitest";
import { runRegressionBenchmark } from "../benchmark/runRegressionBenchmark";
import { collectPerformanceMetrics } from "../performance/collectPerformanceMetrics";

describe("Performance metrics", () => {
  it("computes avg, median, p95 from benchmark", () => {
    const summary = runRegressionBenchmark();
    const perf = summary.performance;

    expect(perf.receiptCount).toBe(7);
    expect(perf.total.sampleCount).toBe(7);
    expect(perf.total.avgMs).toBeGreaterThan(0);
    expect(perf.total.p95Ms).toBeGreaterThanOrEqual(perf.total.medianMs);
  });

  it("handles empty timings", () => {
    const perf = collectPerformanceMetrics([]);
    expect(perf.total.sampleCount).toBe(0);
    expect(perf.total.avgMs).toBe(0);
  });
});
