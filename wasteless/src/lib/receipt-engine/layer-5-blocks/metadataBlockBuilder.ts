import type { ClassifiedGraph } from "../types/models/classify";
import type { MetadataBlock } from "../types/models/blocks";
import { buildGraphIndex } from "../graph/graphIndex";
import { selectBestMerchant, selectBestMerchantFromLines } from "./merchantScorer";
import { averageConfidence, provenanceFromNodes } from "./blockProvenance";
import { parseReceiptNumber, pickBestReceiptNumberText } from "../layer-6-purchase/parsers/receiptNumberParser";
import { parseDate } from "../layer-6-purchase/parsers/dateParser";

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

  const receiptCandidates: string[] = [];
  for (const cn of classified.nodes) {
    if (cn.semanticKind === "receipt_number") {
      receiptCandidates.push(cn.provenance.sourceText);
    }
  }

  const index = buildGraphIndex(classified.graph);
  const scoredMerchant = selectBestMerchant(index.headerLinesForMerchant());
  if (scoredMerchant) {
    merchant = scoredMerchant;
  }

  if (!merchant || isGreetingMerchant(merchant)) {
    const allLines = classified.graph.nodes
      .filter((n) => n.kind === "raw_line")
      .map((n) => n.text);
    const fallback = selectBestMerchantFromLines(allLines);
    if (fallback) merchant = fallback;
  }

  if (!receiptNumber) {
    const candidates = [...receiptCandidates];
    for (const n of classified.graph.nodes) {
      if (n.kind !== "raw_line") continue;
      const parsed = parseReceiptNumber(n.text);
      if (parsed.normalized) candidates.push(n.text);
    }
    receiptNumber = pickBestReceiptNumberText(candidates);
  }

  if (!date) {
    for (const n of classified.graph.nodes) {
      if (n.kind !== "raw_line") continue;
      const parsed = parseDate(n.text);
      if (parsed.normalized) {
        date = n.text;
        break;
      }
    }
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

function isGreetingMerchant(text: string): boolean {
  return /^(teşekkür|tesekkur|teşekkürler|tesekkurler)\b/i.test(text.trim());
}
