/**
 * Commercial rounding policy for Turkish receipt reconciliation.
 * Distinguishes legitimate rounding from extraction errors.
 */

/** Convert TRY to integer kuruş (minor units). */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/** Convert kuruş back to TRY. */
export function fromMinorUnits(minor: number): number {
  return minor / 100;
}

/** Line-level tolerance: qty × unitPrice vs lineTotal. */
export function lineReconciliationTolerance(lineTotal: number): number {
  return Math.max(0.05, Math.abs(lineTotal) * 0.001);
}

/** Receipt-level tolerance: sum vs declared total (fuel/commercial rounding). */
export function receiptReconciliationTolerance(declaredTotal: number): number {
  return Math.max(0.5, Math.abs(declaredTotal) * 0.0005);
}

/** @deprecated Use receiptReconciliationTolerance — kept for gradual migration. */
export const LEGACY_MONEY_TOLERANCE = 0.02;

export function nearlyEqualCommercial(
  a: number,
  b: number,
  tolerance?: number
): boolean {
  const tol = tolerance ?? receiptReconciliationTolerance(Math.max(Math.abs(a), Math.abs(b)));
  return Math.abs(a - b) <= tol;
}
