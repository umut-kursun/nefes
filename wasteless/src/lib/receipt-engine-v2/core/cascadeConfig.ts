/** Cascade hybrid thresholds — calibrated against golden corpus. */
export const CASCADE_THRESHOLDS = {
  /** High confidence: layout rule pack only. */
  RULE_PATH: 0.8,
  /** Medium confidence: rule pack + optional LLM field repair (future). */
  HYBRID_PATH: 0.5,
  /** Minimum parser score to prefer a specialized parser over generic. */
  MIN_PARSER_SCORE: 0.6,
} as const;

export function resolveParsePath(confidence: number): "rule" | "hybrid" | "llm" {
  if (confidence >= CASCADE_THRESHOLDS.RULE_PATH) return "rule";
  if (confidence >= CASCADE_THRESHOLDS.HYBRID_PATH) return "hybrid";
  return "llm";
}
