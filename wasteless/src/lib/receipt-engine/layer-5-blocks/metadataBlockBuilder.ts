import type { ClassifiedGraph } from "../types/models/classify";
import type { MetadataBlock } from "../types/models/blocks";
import { buildGraphIndex } from "../graph/graphIndex";
import { selectBestMerchant } from "./merchantScorer";
import { averageConfidence, provenanceFromNodes } from "./blockProvenance";

const METADATA_KINDS = new Set([
  "merchant",
  "date",
  "time",
  "receipt_number",
  "loyalty",
  "barcode",
]);

export function buildMetadataBlock(
  classified: ClassifiedGraph,
  assigned: Set<string>
): MetadataBlock {
  const map = new Map(classified.nodes.map((n) => [n.id, n]));
  let merchant: string | null = null;
  let date: string | null = null;
  let time: string | null = null;
  let receiptNumber: string | null = null;
  let loyalty: string | null = null;
  const barcodes: string[] = [];
  const nodeRefs: string[] = [];

  for (const cn of classified.nodes) {
    if (assigned.has(cn.id)) continue;
    if (!METADATA_KINDS.has(cn.semanticKind)) continue;

    nodeRefs.push(cn.id);
    assigned.add(cn.id);

    switch (cn.semanticKind) {
      case "merchant":
        merchant = cn.provenance.sourceText;
        break;
      case "date":
        date = cn.provenance.sourceText;
        break;
      case "time":
        time = cn.provenance.sourceText;
        break;
      case "receipt_number":
        receiptNumber = cn.provenance.sourceText;
        break;
      case "loyalty":
        loyalty = cn.provenance.sourceText;
        break;
      case "barcode":
        barcodes.push(cn.provenance.sourceText);
        break;
      default:
        break;
    }
  }

  const index = buildGraphIndex(classified.graph);
  const scoredMerchant = selectBestMerchant(index.headerLinesForMerchant());
  if (scoredMerchant) {
    merchant = scoredMerchant;
  }

  const refs = Object.freeze([...nodeRefs]);
  const confidences = refs.map((id) => map.get(id)?.confidence ?? 0);

  return Object.freeze({
    id: "metadata:main",
    kind: "metadata",
    nodeRefs: refs,
    provenance: provenanceFromNodes(refs, map),
    confidence: averageConfidence(confidences.filter((c) => c > 0)),
    merchant,
    date,
    time,
    receiptNumber,
    loyalty,
    barcodes: Object.freeze(barcodes),
  });
}
