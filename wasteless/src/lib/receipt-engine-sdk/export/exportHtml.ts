import type { ReceiptResult } from "../types";
import { exportMarkdown } from "./exportMarkdown";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportHtml(result: ReceiptResult): string {
  const md = exportMarkdown(result);
  const body = escapeHtml(md).replace(/\n/g, "<br>\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Receipt Analysis</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; line-height: 1.5; }
    pre { white-space: pre-wrap; }
  </style>
</head>
<body>
<pre>${body}</pre>
</body>
</html>
`;
}
