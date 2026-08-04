import type { PurchaseDraft } from "../../../types/models/purchase";
import { nearlyEqual, sumAmounts } from "../issueFactory";

export type TotalMismatchCause = {
  readonly code: string;
  readonly message: string;
  readonly suggestedFix: string;
};

function duplicateDiscountLabels(purchase: PurchaseDraft): string[] {
  const seen = new Map<string, number>();
  const dupes: string[] = [];
  for (const d of purchase.discounts) {
    const key = `${d.label.trim().toLocaleLowerCase("tr-TR")}::${Math.abs(d.amount ?? 0).toFixed(2)}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 2) dupes.push(d.label);
  }
  return dupes;
}

function lineProductAlignmentTolerance(lineTotal: number): number {
  return Math.max(0.05, Math.abs(lineTotal) * 0.001);
}

function productAlignmentForLine(line: PurchaseDraft["products"][number]): TotalMismatchCause | null {
  const qty = line.quantity;
  const unit = line.unitPrice;
  const total = line.lineTotal;
  if (
    qty != null &&
    qty > 0 &&
    unit != null &&
    unit > 0 &&
    total != null &&
    !nearlyEqual(qty * unit, total, lineProductAlignmentTolerance(total))
  ) {
    return {
      code: "PRODUCT_ALIGNMENT",
      message: `"${line.name}" satırında miktar × birim fiyat (${(qty * unit).toFixed(2)}) satır toplamıyla (${total.toFixed(2)}) uyuşmuyor — çarpan satırı yanlış ürüne bağlanmış olabilir.`,
      suggestedFix:
        "Çarpan satırını (ör. 3 AD x 25,90) yalnızca hemen üstündeki ürüne bağlayın.",
    };
  }
  return null;
}

/** First product line where qty × unitPrice does not match lineTotal. */
export function findProductAlignmentDiagnosis(
  purchase: PurchaseDraft
): TotalMismatchCause | null {
  for (const line of purchase.products) {
    const diagnosis = productAlignmentForLine(line);
    if (diagnosis) return diagnosis;
  }
  return null;
}

/** Identify the first structural cause of a receipt total mismatch. */
export function diagnoseReceiptTotalMismatch(
  purchase: PurchaseDraft
): TotalMismatchCause | null {
  const dupes = duplicateDiscountLabels(purchase);
  if (dupes.length > 0) {
    return {
      code: "DUPLICATE_DISCOUNT",
      message: `Aynı indirim birden fazla kez sayılmış: ${dupes[0]}.`,
      suggestedFix:
        "İndirim yalnızca discounts[] içinde olmalı; products[] içinde tekrarlanmamalı.",
    };
  }

  const alignment = findProductAlignmentDiagnosis(purchase);
  if (alignment) return alignment;

  const discountInProducts = purchase.products.filter((p) =>
    /İNDİRİM|INDIRIM|iskonto|kupon|promosyon/i.test(p.name)
  );
  if (discountInProducts.length > 0 && purchase.discounts.length > 0) {
    return {
      code: "DISCOUNT_IN_PRODUCTS",
      message: `İndirim satırı products[] içinde kalmış: "${discountInProducts[0]!.name}".`,
      suggestedFix: "İndirimleri discounts[] dizisine taşıyın; products[] yalnızca satılan ürünleri içermeli.",
    };
  }

  if (purchase.charges.length === 0) {
    const productSum = sumAmounts(purchase.products.map((p) => p.lineTotal));
    const discountSum = sumAmounts(purchase.discounts.map((d) => d.amount));
    const declared = purchase.total?.amount;
    if (
      declared != null &&
      productSum - Math.abs(discountSum) > declared + 0.05
    ) {
      return {
        code: "MISSING_CHARGE",
        message: "Ürün toplamı fiş tutarından yüksek — poşet, kargo veya servis bedeli eksik olabilir.",
        suggestedFix: "charges[] içine eksik ek ücret satırını ekleyin.",
      };
    }
  }

  return null;
}
