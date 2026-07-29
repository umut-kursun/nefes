import type { ClassifiedGraph } from "../types/models/classify";
import type { UnknownBlock, UnknownEntry } from "../types/models/blocks";
import { averageConfidence, provenanceFromNodes } from "./blockProvenance";

export function buildUnknownBlock(
  classified: ClassifiedGraph,
  assigned: Set<string>
): UnknownBlock {
  const map = new Map(classified.nodes.map((n) => [n.id, n]));
  const entries: UnknownEntry[] = [];
  const nodeRefs: string[] = [];

  for (const cn of classified.nodes) {
    if (assigned.has(cn.id)) continue;
    nodeRefs.push(cn.id);
    assigned.add(cn.id);
    entries.push(
      Object.freeze({
        nodeRef: cn.id,
        text: cn.provenance.sourceText,
        semanticKind: cn.semanticKind,
        confidence: cn.confidence,
      })
    );
  }

  const refs = Object.freeze([...nodeRefs]);
  const confidences = refs.map((id) => map.get(id)?.confidence ?? 0);

  return Object.freeze({
    id: "unknown:remainder",
    kind: "unknown",
    nodeRefs: refs,
    provenance: provenanceFromNodes(refs, map),
    confidence: averageConfidence(confidences.filter((c) => c > 0)),
    entries: Object.freeze(entries),
  });
}
