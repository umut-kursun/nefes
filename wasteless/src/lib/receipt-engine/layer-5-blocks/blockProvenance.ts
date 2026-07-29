import type { ClassifiedNode } from "../types/models/classify";
import type { BlockProvenance } from "../types/models/blocks";
import { clampConfidence } from "../types/provenance";

export function provenanceFromNodes(
  nodeIds: readonly string[],
  classified: Map<string, ClassifiedNode>
): BlockProvenance {
  const layoutLineIndices = new Set<number>();
  const rawTexts = new Set<string>();
  const rules = new Set<string>();
  let confidenceSum = 0;
  let count = 0;

  for (const id of nodeIds) {
    const cn = classified.get(id);
    if (!cn) continue;
    cn.provenance.layoutLineIndices.forEach((i) => layoutLineIndices.add(i));
    if (cn.provenance.rawText) rawTexts.add(cn.provenance.rawText);
    cn.matchedRules.forEach((r) => rules.add(r));
    confidenceSum += cn.confidence;
    count += 1;
  }

  return Object.freeze({
    graphNodeIds: Object.freeze([...nodeIds]),
    layoutLineIndices: Object.freeze(
      Array.from(layoutLineIndices).sort((a, b) => a - b)
    ),
    rawTexts: Object.freeze(Array.from(rawTexts)),
    classificationRules: Object.freeze(Array.from(rules)),
    confidence: clampConfidence(count > 0 ? confidenceSum / count : 0),
  });
}

export function averageConfidence(values: number[]): number {
  if (values.length === 0) return 0;
  return clampConfidence(values.reduce((a, b) => a + b, 0) / values.length);
}
