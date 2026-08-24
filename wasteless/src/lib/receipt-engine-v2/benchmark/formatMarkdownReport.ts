import type { BenchmarkCategoryComparison, BenchmarkComparisonRank } from "./scoreCategory";
import type { BenchmarkReceiptResult, BenchmarkReport } from "./runBenchmark";

function rankLabel(rank: BenchmarkComparisonRank): string {
  switch (rank) {
    case "better":
      return "✓ Better (V2)";
    case "same":
      return "✓ Same";
    case "worse":
      return "✓ Worse (V2)";
  }
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} sec`;
  return `${ms.toFixed(1)} ms`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatCategoryTitle(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function formatReceiptSection(receipt: BenchmarkReceiptResult): string {
  const lines: string[] = [
    `### ${receipt.label} (\`${receipt.slug}\`)`,
    "",
    "| Category | V1 | V2 | Rank |",
    "| --- | ---: | ---: | --- |",
  ];

  for (const comparison of receipt.comparisons) {
    lines.push(
      `| ${formatCategoryTitle(comparison.category)} | ${comparison.v1Score}/10 | ${comparison.v2Score}/10 | ${rankLabel(comparison.rank)} |`
    );
  }

  lines.push(
    "",
    "**Performance**",
    "",
    `- V1: ${formatMs(receipt.v1.metrics.executionTimeMs)} · ${formatBytes(receipt.v1.metrics.memoryHeapDeltaBytes)} heap Δ`,
    `- V2: ${formatMs(receipt.v2.metrics.executionTimeMs)} · ${formatBytes(receipt.v2.metrics.memoryHeapDeltaBytes)} heap Δ`,
    "",
    `**Receipt overall:** V1 ${receipt.v1Overall}% · V2 ${receipt.v2Overall}%`,
    ""
  );

  if (receipt.v1.validationErrorCount > 0 || receipt.v1.validationWarningCount > 0) {
    lines.push(
      `- V1 validation: ${receipt.v1.validationIsValid ? "valid" : "invalid"} · ${receipt.v1.validationErrorCount} errors · ${receipt.v1.validationWarningCount} warnings · score ${receipt.v1.validationScore ?? "n/a"}`,
      ""
    );
  }

  return lines.join("\n");
}

function formatAggregateCategories(
  comparisons: readonly BenchmarkCategoryComparison[]
): string {
  const lines: string[] = [];

  for (const comparison of comparisons) {
    lines.push(
      `### ${formatCategoryTitle(comparison.category)}`,
      "",
      `- V1 **${comparison.v1Score}/10**`,
      `- V2 **${comparison.v2Score}/10**`,
      `- Rank: **${rankLabel(comparison.rank)}**`,
      ""
    );
  }

  return lines.join("\n");
}

export function formatBenchmarkMarkdown(report: BenchmarkReport): string {
  const perf = report.performance;
  const perfRank =
    perf.fasterEngine === "v2"
      ? "✓ Better (V2 faster)"
      : perf.fasterEngine === "v1"
        ? "✓ Worse (V1 faster)"
        : "✓ Same";

  const memoryRank =
    perf.lowerMemoryEngine === "v2"
      ? "✓ Better (V2 lower heap Δ)"
      : perf.lowerMemoryEngine === "v1"
        ? "✓ Worse (V1 lower heap Δ)"
        : "✓ Same";

  const lines: string[] = [
    "# Receipt Engine V1 vs V2 Benchmark",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Golden receipts: **${report.receiptCount}**`,
    "",
    "## Overall",
    "",
    "| Engine | Score |",
    "| --- | ---: |",
    `| V1 | **${report.v1OverallScore}%** |`,
    `| V2 | **${report.v2OverallScore}%** |`,
    "",
    "## Category Rankings (avg across golden receipts)",
    "",
    formatAggregateCategories(report.categoryComparisons),
    "## Performance",
    "",
    "| Metric | V1 | V2 | Rank |",
    "| --- | ---: | ---: | --- |",
    `| Total execution time | ${formatMs(perf.v1TotalMs)} | ${formatMs(perf.v2TotalMs)} | ${perfRank} |`,
    `| Avg execution time | ${formatMs(perf.v1AvgMs)} | ${formatMs(perf.v2AvgMs)} | ${perfRank} |`,
    `| Avg heap delta | ${formatBytes(perf.v1AvgHeapDeltaBytes)} | ${formatBytes(perf.v2AvgHeapDeltaBytes)} | ${memoryRank} |`,
    `| Peak heap delta | ${formatBytes(perf.v1PeakHeapDeltaBytes)} | ${formatBytes(perf.v2PeakHeapDeltaBytes)} | ${memoryRank} |`,
    "",
    "## Per-receipt Results",
    "",
  ];

  for (const receipt of report.receipts) {
    lines.push(formatReceiptSection(receipt));
  }

  lines.push(
    "## Summary",
    "",
    `- V1 overall: **${report.v1OverallScore}%**`,
    `- V2 overall: **${report.v2OverallScore}%**`,
    `- Winner: **${report.v2OverallScore >= report.v1OverallScore ? "V2" : "V1"}**`,
    ""
  );

  return lines.join("\n");
}
