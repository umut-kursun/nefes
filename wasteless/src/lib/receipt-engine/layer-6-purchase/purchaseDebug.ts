import type { PurchaseDraft, PurchaseLine } from "../types/models/purchase";

export interface PurchaseInspection {
  product: PurchaseLine;
  productBlockId: string;
  graphNodeCount: number;
  layoutLineIndices: readonly number[];
  rawTexts: readonly string[];
  ocrTexts: readonly string[];
  confidence: number;
}

export function inspectPurchase(
  draft: PurchaseDraft,
  productIndex: number
): PurchaseInspection | null {
  const product = draft.products[productIndex];
  if (!product) return null;

  return {
    product,
    productBlockId: product.provenance.productBlockId,
    graphNodeCount: product.provenance.graphNodeIds.length,
    layoutLineIndices: product.provenance.layoutLineIndices,
    rawTexts: product.provenance.rawTexts,
    ocrTexts: product.provenance.ocrTexts,
    confidence: product.confidence,
  };
}

export function formatPurchaseDebug(draft: PurchaseDraft): string {
  const lines = [
    `PurchaseDraft confidence=${draft.confidence.toFixed(2)}`,
    `  merchant=${draft.merchant ?? "(none)"}`,
    `  date=${draft.purchaseDate?.raw ?? "(none)"}`,
    `  time=${draft.purchaseTime?.raw ?? "(none)"}`,
    `  receiptNo=${draft.receiptNumber?.raw ?? "(none)"}`,
    `  currency=${draft.currency?.raw ?? "(none)"}`,
    `  products=${draft.products.length}`,
    `  charges=${draft.charges.length} discounts=${draft.discounts.length}`,
    `  payments=${draft.payments.length} vatSummary=${draft.vatSummary.length}`,
    `  subtotal=${draft.subtotal?.amount ?? "-"} total=${draft.total?.amount ?? "-"}`,
    "",
    "products:",
  ];

  for (const product of draft.products) {
    const qty = product.quantity !== undefined ? String(product.quantity) : "-";
    const unit = product.unit ?? "-";
    lines.push(
      `  "${product.name}" qty=${qty} ${unit} line=${product.lineTotal ?? "-"} vat=${product.vatRate ?? "-"} conf=${product.confidence.toFixed(2)}`
    );
  }

  lines.push("", "footer:");
  for (const entry of [
    ...draft.charges,
    ...draft.discounts,
    ...draft.payments,
    ...draft.vatSummary,
  ]) {
    lines.push(
      `  "${entry.label}" ${entry.amount ?? "-"} nodes=${entry.provenance.graphNodeIds.length}`
    );
  }

  if (draft.subtotal) {
    lines.push(`  subtotal "${draft.subtotal.label}" ${draft.subtotal.amount ?? "-"}`);
  }
  if (draft.total) {
    lines.push(`  total "${draft.total.label}" ${draft.total.amount ?? "-"}`);
  }

  return lines.join("\n");
}

export function purchaseDraftToJson(draft: PurchaseDraft): string {
  return JSON.stringify(draft, null, 2);
}
