import type { LayoutDocument } from "@/lib/receipt-engine/types/models/layout";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { RejectedCandidateLine } from "../types";

function collectUsedLineIndices(purchase: PurchaseDraft): Set<number> {
  const used = new Set<number>();
  for (const product of purchase.products) {
    for (const idx of product.provenance.layoutLineIndices) used.add(idx);
  }
  for (const line of [
    ...purchase.charges,
    ...purchase.discounts,
    ...purchase.payments,
    ...purchase.vatSummary,
    ...(purchase.subtotal ? [purchase.subtotal] : []),
    ...(purchase.total ? [purchase.total] : []),
  ]) {
    void line;
  }
  return used;
}

function rejectionReason(
  line: LayoutDocument["lines"][number],
  used: Set<number>
): string {
  if (used.has(line.index)) return "Promoted to purchase field";
  if (line.sectionKind === "card_slip") {
    return "Card slip section — excluded from products";
  }
  if (line.sectionKind === "payments") {
    return "Payment section line not promoted to payment field";
  }
  if (line.sectionKind === "totals") {
    return "Totals section line not mapped to subtotal/total/VAT";
  }
  if (line.features.isAmountOnly) {
    return "Amount-only line without product context";
  }
  if (line.features.isLikelyContinuation) {
    return "Treated as continuation, not standalone product";
  }
  if (line.lineSemanticType === "FooterLine") {
    return "Footer line excluded from products";
  }
  if (line.sectionKind === "products" && line.trailingAmount == null) {
    return "Products section line without valid amount";
  }
  return "Not promoted to purchase draft field";
}

/** Derive rejected layout lines analytically — no parser changes. */
export function buildRejectedCandidates(
  layout: LayoutDocument,
  purchase: PurchaseDraft
): readonly RejectedCandidateLine[] {
  const used = collectUsedLineIndices(purchase);
  const rejected: RejectedCandidateLine[] = [];

  for (const line of layout.lines) {
    if (used.has(line.index)) continue;
    const reason = rejectionReason(line, used);
    if (reason === "Promoted to purchase field") continue;
    rejected.push({
      lineIndex: line.index,
      text: line.text,
      sectionKind: line.sectionKind,
      lineSemanticType: line.lineSemanticType,
      reason,
    });
  }

  return Object.freeze(rejected);
}
