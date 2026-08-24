import type { PurchaseDraft, PurchaseLine } from "../../types/models/purchase";
import { nearlyEqual } from "./issueFactory";

/** Non-purchase OCR lines that may appear in products[] but must not affect totals. */
const METADATA_NAME =
  /^(TEL:|VD:|V\.D\.|EPDK:|MERSİS|MERSIS|ADA NO:|NO:\d|Fiş No:|#\d|SATIŞ|BİLGİ FİŞİ|Tür:|Fatura\/)/i;

const FUEL_PRODUCT_NAME = /MOTOR|BENZ|DIZEL|DİZEL|DIESEL|LPG|V\s*\/?\s*MAX/i;

function extractionMethod(line: PurchaseLine): string {
  return line.provenance.classificationRules?.[0] ?? "";
}

/**
 * Whether a product row should contribute to receipt total reconciliation.
 * Extraction may leave metadata or duplicate fuel rows in products[] — this
 * boundary keeps validation focused on purchase lines only.
 */
export function isReconciliationEligibleProduct(
  line: PurchaseLine,
  purchase: PurchaseDraft
): boolean {
  if (line.lineTotal == null) return false;

  const method = extractionMethod(line);
  if (method === "semantic:product-name-only") return false;

  if (METADATA_NAME.test(line.name.trim())) return false;

  if (purchase.fuel != null && method === "semantic:fuel-merge") {
    const hasNamedFuelLine = purchase.products.some(
      (other) =>
        other !== line &&
        other.lineTotal != null &&
        nearlyEqual(other.lineTotal, line.lineTotal!) &&
        FUEL_PRODUCT_NAME.test(other.name)
    );
    if (hasNamedFuelLine) return false;
  }

  return true;
}

export function reconciliationProducts(
  purchase: PurchaseDraft
): readonly PurchaseLine[] {
  return purchase.products.filter((line) =>
    isReconciliationEligibleProduct(line, purchase)
  );
}
