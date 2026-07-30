import type { RegressionRunSummary } from "../types";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type DashboardTrend = {
  readonly passRateDelta?: number;
  readonly avgConfidenceDelta?: number;
  readonly totalMsDelta?: number;
};

/** Generate HTML regression dashboard. */
export function generateRegressionDashboardHtml(
  summary: RegressionRunSummary,
  trend?: DashboardTrend
): string {
  const perf = summary.performance;
  const receiptRows = summary.receipts
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.slug)}</td>
        <td>${r.layoutMatch ? "✓" : "✗"}</td>
        <td>${r.purchaseMatch ? "✓" : "✗"}</td>
        <td>${r.validationMatch ? "✓" : "✗"}</td>
        <td>${(r.confidence * 100).toFixed(1)}%</td>
        <td>${r.validationErrors}</td>
        <td>${r.timings.totalMs ?? "—"} ms</td>
      </tr>`
    )
    .join("");

  const stageRows = Object.entries(perf.stages)
    .map(
      ([name, s]) => `<tr>
        <td>${escapeHtml(name)}</td>
        <td>${s.avgMs} ms</td>
        <td>${s.medianMs} ms</td>
        <td>${s.p95Ms} ms</td>
      </tr>`
    )
    .join("");

  const trendBlock =
    trend != null
      ? `<div class="summary">
    <div class="card">Pass rate Δ ${trend.passRateDelta != null ? (trend.passRateDelta >= 0 ? "+" : "") + pct(trend.passRateDelta) : "—"}</div>
    <div class="card">Confidence Δ ${trend.avgConfidenceDelta != null ? (trend.avgConfidenceDelta >= 0 ? "+" : "") + trend.avgConfidenceDelta.toFixed(3) : "—"}</div>
    <div class="card">Total ms Δ ${trend.totalMsDelta != null ? trend.totalMsDelta + " ms" : "—"}</div>
  </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Receipt Engine — Regression Dashboard</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; background: #0f172a; color: #e2e8f0; }
    h1, h2 { color: #38bdf8; }
    .summary { display: flex; gap: 1rem; flex-wrap: wrap; margin: 1rem 0; }
    .card { background: #1e293b; padding: 1rem 1.5rem; border-radius: 8px; min-width: 140px; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid #334155; padding: 0.5rem; text-align: left; }
    th { background: #1e293b; }
  </style>
</head>
<body>
  <h1>Receipt Engine Regression Dashboard</h1>
  <p>Generated ${escapeHtml(summary.generatedAt)}</p>
  <div class="summary">
    <div class="card"><strong>Receipts</strong><br/>${summary.receiptCount}</div>
    <div class="card"><strong>Pass rate</strong><br/>${pct(summary.passRate)}</div>
    <div class="card"><strong>Avg confidence</strong><br/>${(summary.avgConfidence * 100).toFixed(1)}%</div>
    <div class="card"><strong>Validation errors</strong><br/>${summary.totalValidationErrors}</div>
    <div class="card"><strong>Total p95</strong><br/>${perf.total.p95Ms} ms</div>
  </div>
  ${trendBlock}
  <h2>Per-receipt results</h2>
  <table>
    <thead><tr><th>Receipt</th><th>Layout</th><th>Purchase</th><th>Validation</th><th>Confidence</th><th>Errors</th><th>Latency</th></tr></thead>
    <tbody>${receiptRows}</tbody>
  </table>
  <h2>Performance (avg / median / p95)</h2>
  <table>
    <thead><tr><th>Stage</th><th>Avg</th><th>Median</th><th>P95</th></tr></thead>
    <tbody>${stageRows}</tbody>
  </table>
</body>
</html>`;
}
