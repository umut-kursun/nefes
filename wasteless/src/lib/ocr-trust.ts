export type TrustLevel = "high" | "medium" | "low";

/** OCR trust UI applies only to receipt scans — not manual or quick-button entries. */
export function shouldShowOcrTrustBanner(
  sourceType: string | null | undefined,
  confidence: number | null | undefined
): boolean {
  if (sourceType === "manual" || sourceType === "quick_button") return false;
  return confidence != null && sourceType === "receipt";
}

export function resolveTrustLevel(
  confidence: number | null | undefined
): TrustLevel | null {
  if (confidence == null) return null;
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.7) return "medium";
  return "low";
}
