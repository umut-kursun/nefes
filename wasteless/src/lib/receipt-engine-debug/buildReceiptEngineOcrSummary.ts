import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { LineItemIssue } from "@/lib/receipt-quality";
import { ITEM_CONFIRM_THRESHOLD } from "@/lib/receipt-pipeline";

export type ReceiptEngineOcrSummary = {
  productCount: number;
  reviewCount: number;
  totalVerified: boolean;
  ocrConfidence: number | null;
  mathValidationPassed: boolean;
  issues: LineItemIssue[];
};

const CODE_REASON: Record<string, string> = {
  DUPLICATE_DISCOUNT: "Aynı indirim birden fazla kez sayılmış",
  PRODUCT_ALIGNMENT: "Çarpan satırı yanlış ürüne bağlanmış olabilir",
  DISCOUNT_IN_PRODUCTS: "İndirim products[] içinde kalmış",
  MISSING_CHARGE: "Ek ücret (poşet/kargo) eksik olabilir",
  TOTAL_MISMATCH: "Fiş toplamı satır toplamlarıyla uyuşmuyor",
};

function validationIssuesToLineItems(
  validation: ValidationReportGolden
): LineItemIssue[] {
  return validation.errors.map((issue) => ({
    name: CODE_REASON[issue.code] ?? issue.code,
    reason: issue.suggestedFix
      ? `${issue.message} — ${issue.suggestedFix}`
      : issue.message,
    expected: issue.expected ?? null,
    parsed: issue.actual ?? null,
  }));
}

/** Build review UI summary from Receipt Engine purchase + validation. */
export function buildReceiptEngineOcrSummary(
  purchase: PurchaseDraft,
  validation: ValidationReportGolden
): ReceiptEngineOcrSummary {
  const productCount = purchase.products.length;
  const reviewCount = purchase.products.filter(
    (p) => (p.confidence ?? 1) < ITEM_CONFIRM_THRESHOLD
  ).length;

  return {
    productCount,
    reviewCount,
    totalVerified: validation.isValid,
    ocrConfidence: purchase.confidence ?? purchase.provenance.blockDocumentConfidence ?? null,
    mathValidationPassed: validation.isValid,
    issues: validationIssuesToLineItems(validation),
  };
}
