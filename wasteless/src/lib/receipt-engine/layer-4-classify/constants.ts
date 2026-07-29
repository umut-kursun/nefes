import { CONFIDENCE } from "../types/provenance";

/** Named confidence levels for classification rules — no raw magic numbers. */
export const RULE_CONFIDENCE = {
  exactLabel: CONFIDENCE.high,
  structural: CONFIDENCE.medium,
  region: CONFIDENCE.medium,
  inferred: CONFIDENCE.medium,
  fallback: CONFIDENCE.low,
} as const;
