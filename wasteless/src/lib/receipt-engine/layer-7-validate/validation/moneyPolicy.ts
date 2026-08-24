/**
 * Commercial rounding policy for Turkish receipt reconciliation.
 * Distinguishes legitimate rounding (fuel qty×price) from extraction errors.
 */

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function fromMinorUnits(minor: number): number {
  return minor / 100;
}

/** Line-level: quantity × unitPrice vs lineTotal. */
export function lineReconciliationTolerance(lineTotal: number): number {
  return Math.max(0.05, Math.abs(lineTotal) * 0.001);
}

/** Receipt-level: sum of lines vs declared TOPLAM. */
export function receiptReconciliationTolerance(declaredTotal: number): number {
  return Math.max(0.5, Math.abs(declaredTotal) * 0.0005);
}

/** @deprecated Use receiptReconciliationTolerance — legacy 2-kuruş default. */
export const LEGACY_MONEY_TOLERANCE = 0.02;
