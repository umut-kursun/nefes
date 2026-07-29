import type { LayerId } from "./layer";

/** Confidence score in the closed interval [0, 1]. */
export type Confidence = number;

export interface SourceRef {
  layer: LayerId;
  nodeId?: string;
  rawTextSpan?: { start: number; end: number };
  ai?: boolean;
}

export interface FieldProvenance<T> {
  value: T;
  confidence: Confidence;
  source: SourceRef;
  reason?: string;
}

export const CONFIDENCE = {
  none: 0,
  low: 0.35,
  medium: 0.65,
  high: 0.85,
  certain: 1,
} as const;

export function clampConfidence(value: number): Confidence {
  if (!Number.isFinite(value)) return CONFIDENCE.none;
  return Math.max(0, Math.min(1, value));
}
