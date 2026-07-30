import type { PurchaseDiff } from "../types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatValue(v: unknown): string {
  if (v === undefined) return "—";
  if (typeof v === "object") return escapeHtml(JSON.stringify(v, null, 2));
  return escapeHtml(String(v));
}

/** Generate standalone HTML diff viewer for PurchaseDraft changes. */
export function generateDiffViewerHtml(
  diffs: readonly PurchaseDiff[]
): string {
  const changed = diffs.filter((d) => d.hasChanges);
  const rows = changed
    .flatMap((diff) =>
      diff.changes.map(
        (c) => `
      <tr>
        <td>${escapeHtml(diff.receiptId)}</td>
        <td><code>${escapeHtml(c.path)}</code></td>
        <td class="kind-${c.kind}">${c.kind}</td>
        <td><pre>${formatValue(c.before)}</pre></td>
        <td><pre>${formatValue(c.after)}</pre></td>
      </tr>`
      )
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Receipt Engine — Purchase Diff</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; background: #0f172a; color: #e2e8f0; }
    h1 { color: #38bdf8; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { border: 1px solid #334155; padding: 0.5rem; vertical-align: top; }
    th { background: #1e293b; }
    pre { margin: 0; font-size: 0.85rem; white-space: pre-wrap; }
    .kind-added { color: #4ade80; }
    .kind-removed { color: #f87171; }
    .kind-changed { color: #fbbf24; }
    .summary { display: flex; gap: 1.5rem; flex-wrap: wrap; margin: 1rem 0; }
    .card { background: #1e293b; padding: 1rem 1.5rem; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>Receipt Diff Viewer</h1>
  <div class="summary">
    <div class="card"><strong>Receipts compared</strong><br/>${diffs.length}</div>
    <div class="card"><strong>With changes</strong><br/>${changed.length}</div>
    <div class="card"><strong>Generated</strong><br/>${escapeHtml(new Date().toISOString())}</div>
  </div>
  ${
    rows
      ? `<table>
    <thead><tr><th>Receipt</th><th>Field</th><th>Change</th><th>Before</th><th>After</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`
      : "<p>No purchase draft differences detected.</p>"
  }
</body>
</html>`;
}
