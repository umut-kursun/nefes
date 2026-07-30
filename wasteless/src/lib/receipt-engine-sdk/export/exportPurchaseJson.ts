import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ReceiptResult } from "../types";

export function exportPurchaseJson(purchase: PurchaseDraft): string {
  return `${JSON.stringify(purchase, null, 2)}\n`;
}

export function exportPurchaseFromResult(result: ReceiptResult): string {
  return exportPurchaseJson(result.purchase);
}
