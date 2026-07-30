import type { ReceiptResult } from "../types";

export function exportMarkdown(result: ReceiptResult): string {
  const { purchase, validation, confidence } = result;
  const lines: string[] = [
    "# Receipt Analysis",
    "",
    `**Merchant:** ${purchase.merchant ?? "Unknown"}`,
    `**Valid:** ${validation.isValid ? "Yes" : "No"}`,
    `**Score:** ${validation.score}`,
    `**Overall confidence:** ${confidence.overall.toFixed(2)}`,
    "",
    "## Products",
    "",
  ];

  if (purchase.products.length === 0) {
    lines.push("_No products extracted._");
  } else {
    for (const product of purchase.products) {
      lines.push(
        `- ${product.name} × ${product.quantity ?? "?"} = ${product.lineTotal ?? "?"}`
      );
    }
  }

  lines.push("", "## Payments", "");
  if (purchase.payments.length === 0) {
    lines.push("_No payments extracted._");
  } else {
    for (const payment of purchase.payments) {
      lines.push(`- ${payment.label}: ${payment.amount ?? "?"}`);
    }
  }

  if (validation.errors.length > 0) {
    lines.push("", "## Validation Errors", "");
    for (const error of validation.errors) {
      lines.push(`- \`${error.code}\`: ${error.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
