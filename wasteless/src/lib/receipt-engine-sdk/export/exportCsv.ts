import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ReceiptResult } from "../types";

function escapeCsv(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function exportCsv(purchase: PurchaseDraft): string {
  const rows: string[] = [
    "type,name,quantity,unit,unitPrice,totalPrice,vatRate",
  ];

  for (const product of purchase.products) {
    rows.push(
      [
        "product",
        product.name,
        product.quantity ?? "",
        product.unit ?? "",
        product.unitPrice ?? "",
        product.lineTotal ?? "",
        product.vatRate ?? "",
      ]
        .map(escapeCsv)
        .join(",")
    );
  }

  for (const payment of purchase.payments) {
    rows.push(
      ["payment", payment.label, "", "", "", payment.amount ?? "", ""]
        .map(escapeCsv)
        .join(",")
    );
  }

  return `${rows.join("\n")}\n`;
}

export function exportCsvFromResult(result: ReceiptResult): string {
  return exportCsv(result.purchase);
}
