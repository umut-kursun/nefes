import type { NormalizedPurchase, ValidationIssue, ValidationReport } from "../types";

/** Stage 8 — validation reports only; never mutates purchase. */
export function validatePurchase(purchase: NormalizedPurchase): ValidationReport {
  const issues: ValidationIssue[] = [];

  const productSum = purchase.products.reduce(
    (s, p) => s + (p.lineTotal ?? 0),
    0
  );
  const chargeSum = purchase.charges.reduce((s, c) => s + (c.amount ?? 0), 0);
  const discountSum = purchase.discounts.reduce((s, d) => s + (d.amount ?? 0), 0);
  const expectedTotal = productSum + chargeSum - discountSum;

  if (purchase.total?.amount != null) {
    const delta = Math.abs(purchase.total.amount - expectedTotal);
    if (delta > 0.05) {
      issues.push({
        code: "total_mismatch",
        message: `Total ${purchase.total.amount} ≠ products+charges-discounts (${expectedTotal.toFixed(2)})`,
        severity: "error",
      });
    }
  }

  if (purchase.products.length === 0) {
    issues.push({
      code: "no_products",
      message: "No products extracted",
      severity: "warning",
    });
  }

  for (const p of purchase.products) {
    if (/\b(toplam|topkdv|kdv|nakit|kredi|ortak|pos)\b/i.test(p.name)) {
      issues.push({
        code: "footer_as_product",
        message: `Footer line classified as product: ${p.name}`,
        severity: "error",
      });
    }
  }

  const paymentSum = purchase.payments.reduce((s, p) => s + (p.amount ?? 0), 0);
  if (
    purchase.payments.length > 0 &&
    purchase.total?.amount != null &&
    Math.abs(paymentSum - purchase.total.amount) > 0.05
  ) {
    issues.push({
      code: "payment_mismatch",
      message: "Payment sum does not match total",
      severity: "warning",
    });
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const score = Math.max(0, 100 - errorCount * 25 - issues.length * 5);

  return { issues, score };
}
