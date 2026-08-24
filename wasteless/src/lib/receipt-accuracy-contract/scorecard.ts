import type {
  ContractReport,
  CorpusReceiptId,
  CorpusScorecard,
  ReceiptPipelineSnapshot,
} from "./types";

function countVerdicts(
  reports: readonly ContractReport[],
  field: keyof Pick<
    ContractReport,
    "merchant" | "category" | "date" | "time" | "total" | "products" | "payment"
  >
) {
  const tally = { correct: 0, needs_review: 0, incorrect: 0 };
  for (const report of reports) {
    tally[report[field]] += 1;
  }
  return tally;
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]!;
}

export function buildScorecard(params: {
  phase: string;
  tier: ReceiptPipelineSnapshot["tier"];
  reports: readonly ContractReport[];
  snapshots: readonly ReceiptPipelineSnapshot[];
}): CorpusScorecard {
  const timings = params.snapshots.map((s) => s.timings.totalMs).sort((a, b) => a - b);
  return {
    phase: params.phase,
    capturedAt: new Date().toISOString(),
    tier: params.tier,
    reports: params.reports,
    summary: {
      merchant: countVerdicts(params.reports, "merchant"),
      category: countVerdicts(params.reports, "category"),
      date: countVerdicts(params.reports, "date"),
      time: countVerdicts(params.reports, "time"),
      total: countVerdicts(params.reports, "total"),
      products: countVerdicts(params.reports, "products"),
      payment: countVerdicts(params.reports, "payment"),
      falseApprovals: params.reports.filter((r) => r.falseApproval).length,
    },
    latency: {
      p50Ms: percentile(timings, 50),
      p95Ms: percentile(timings, 95),
      maxMs: timings.length ? timings[timings.length - 1]! : 0,
      samples: params.snapshots.map((s) => ({
        id: s.id as CorpusReceiptId,
        totalMs: s.timings.totalMs,
      })),
    },
  };
}

export function formatScorecardMarkdown(scorecard: CorpusScorecard): string {
  const lines: string[] = [
    `# Receipt Accuracy Scorecard — ${scorecard.phase}`,
    "",
    `- **Captured:** ${scorecard.capturedAt}`,
    `- **Tier:** ${scorecard.tier}`,
    "",
    "## Summary (9-receipt corpus)",
    "",
    "| Field | Correct | Needs review | Incorrect |",
    "|-------|---------|--------------|-----------|",
  ];

  const fields = [
    ["Merchant", scorecard.summary.merchant],
    ["Category", scorecard.summary.category],
    ["Date", scorecard.summary.date],
    ["Time", scorecard.summary.time],
    ["Total", scorecard.summary.total],
    ["Products", scorecard.summary.products],
    ["Payment", scorecard.summary.payment],
  ] as const;

  for (const [label, tally] of fields) {
    lines.push(
      `| ${label} | ${tally.correct}/9 | ${tally.needs_review}/9 | ${tally.incorrect}/9 |`
    );
  }

  lines.push(
    "",
    `**False approvals:** ${scorecard.summary.falseApprovals}/9`,
    "",
    "## Latency",
    "",
    `- P50: ${scorecard.latency.p50Ms} ms`,
    `- P95: ${scorecard.latency.p95Ms} ms`,
    `- Max: ${scorecard.latency.maxMs} ms`,
    "",
    "| Receipt | Total ms |",
    "|---------|----------|"
  );

  for (const sample of scorecard.latency.samples) {
    lines.push(`| ${sample.id} | ${sample.totalMs} |`);
  }

  lines.push("", "## Per-receipt contract", "");

  for (const report of scorecard.reports) {
    lines.push(
      `### ${report.id} — ${report.name}`,
      "",
      `- Status: \`${report.analysisStatus}\` · falseApproval: **${report.falseApproval}**`,
      `- Merchant: \`${report.merchant}\` · Category: \`${report.category}\` · Total: \`${report.total}\` · Products: \`${report.products}\` · Payment: \`${report.payment}\``,
      `- Date: \`${report.date}\` · Time: \`${report.time}\``,
      report.notes.length ? `- Notes: ${report.notes.join("; ")}` : "- Notes: —",
      ""
    );
  }

  return lines.join("\n");
}
