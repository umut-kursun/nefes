import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatBenchmarkMarkdown } from "./formatMarkdownReport";
import { runBenchmark } from "./runBenchmark";

describe("Receipt Engine V1 vs V2 benchmark", () => {
  it("runs benchmark across all golden receipts", () => {
    const report = runBenchmark();

    expect(report.receiptCount).toBeGreaterThan(0);
    expect(report.receipts.length).toBe(report.receiptCount);

    for (const receipt of report.receipts) {
      expect(receipt.v1Scores.length).toBeGreaterThan(0);
      expect(receipt.v2Scores.length).toBeGreaterThan(0);
      expect(receipt.v1.metrics.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(receipt.v2.metrics.executionTimeMs).toBeGreaterThanOrEqual(0);
    }

    expect(report.v1OverallScore).toBeGreaterThanOrEqual(0);
    expect(report.v2OverallScore).toBeGreaterThanOrEqual(0);
    expect(report.categoryComparisons.length).toBeGreaterThan(0);
  });

  it("generates markdown report", () => {
    const report = runBenchmark();
    const markdown = formatBenchmarkMarkdown(report);

    expect(markdown).toContain("# Receipt Engine V1 vs V2 Benchmark");
    expect(markdown).toContain("## Overall");
    expect(markdown).toContain("V1");
    expect(markdown).toContain("V2");
    expect(markdown).toContain("## Performance");

    const output = path.join(process.cwd(), "reports", "v1-v2-benchmark.md");
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${markdown}\n`, "utf8");
  });
});
