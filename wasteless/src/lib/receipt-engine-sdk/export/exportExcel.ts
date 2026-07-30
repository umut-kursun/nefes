import * as XLSX from "xlsx";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ReceiptResult } from "../types";

export function exportExcel(purchase: PurchaseDraft): Buffer {
  const products = purchase.products.map((p) => ({
    type: "product",
    name: p.name,
    quantity: p.quantity ?? "",
    unit: p.unit ?? "",
    unitPrice: p.unitPrice ?? "",
    totalPrice: p.lineTotal ?? "",
    vatRate: p.vatRate ?? "",
  }));

  const payments = purchase.payments.map((p) => ({
    type: "payment",
    name: p.label,
    quantity: "",
    unit: "",
    unitPrice: "",
    totalPrice: p.amount ?? "",
    vatRate: "",
  }));

  const sheet = XLSX.utils.json_to_sheet([...products, ...payments]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Receipt");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function exportExcelFromResult(result: ReceiptResult): Buffer {
  return exportExcel(result.purchase);
}
