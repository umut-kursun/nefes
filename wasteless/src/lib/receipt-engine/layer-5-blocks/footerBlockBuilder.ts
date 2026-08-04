import type { ClassifiedGraph, ClassifiedNode, SemanticKind } from "../types/models/classify";
import type { GraphIndex } from "../graph/graphIndex";
import type { RowView } from "../graph/rowView";
import type { FooterBlock, FooterLineEntry } from "../types/models/blocks";
import { averageConfidence, provenanceFromNodes } from "./blockProvenance";
import { matchesPayment } from "../patterns/neutral";
import {
  extractInlineAmount,
  isBankIssuerOnlyLine,
  stripAmountFromLabel,
} from "../patterns/lineSanitize";

const FOOTER_KINDS = new Set<SemanticKind>([
  "charge",
  "discount",
  "payment",
  "total",
  "subtotal",
  "vat",
  "footer",
]);

function rowPrimaryKind(
  row: RowView,
  classified: Map<string, ClassifiedNode>
): SemanticKind {
  const fragKind = row.nameFragmentId
    ? classified.get(row.nameFragmentId)?.semanticKind
    : null;
  const rawKind = classified.get(row.rawLineId)?.semanticKind;
  return fragKind ?? rawKind ?? "unknown";
}

function rowLabel(index: GraphIndex, row: RowView): string {
  const fragId = row.nameFragmentId;
  if (fragId) return index.node(fragId)?.text ?? row.rawLineNode.text;
  return row.rawLineNode.text;
}

function rowAmount(index: GraphIndex, row: RowView): number | null {
  const amountId = row.amountNodeIds[0] ?? row.boundAmountNodeIds[0];
  if (amountId) {
    const fromGraph = index.node(amountId)?.amount ?? null;
    if (fromGraph != null) return fromGraph;
  }
  return extractInlineAmount(rowLabel(index, row));
}

function rowLabelClean(index: GraphIndex, row: RowView): string {
  return stripAmountFromLabel(rowLabel(index, row));
}

function buildFooterEntry(
  row: RowView,
  index: GraphIndex,
  classified: Map<string, ClassifiedNode>
): FooterLineEntry {
  const kind = rowPrimaryKind(row, classified);
  const nodeRefs = Object.freeze([...row.allNodeIds]);
  const confidences = nodeRefs.map((id) => classified.get(id)?.confidence ?? 0);

  return Object.freeze({
    label: rowLabelClean(index, row),
    amount: rowAmount(index, row),
    nodeRefs,
    semanticKind: kind,
    confidence: averageConfidence(confidences.filter((c) => c > 0)),
  });
}

function pushEntry(
  target: FooterLineEntry[],
  entry: FooterLineEntry,
  assigned: Set<string>
): void {
  entry.nodeRefs.forEach((id) => assigned.add(id));
  target.push(entry);
}

function isLegalPaymentFooter(label: string): boolean {
  const payLabel = label.toLowerCase();
  return /kart\s*hizmet|hakkında|hakkinda|saklayınız|belgeyi|yukarıda\s*yazılı|kart\s*sahib|bu\s*i[sş]lem|temassiz|nus[iİ]la/i.test(
    payLabel
  );
}

function shouldIncludePayment(
  entry: FooterLineEntry,
  section: string | null
): boolean {
  if (isLegalPaymentFooter(entry.label)) return false;
  if (isBankIssuerOnlyLine(entry.label) && entry.amount == null) return false;
  if (entry.semanticKind === "payment" && matchesPayment(entry.label)) return true;
  if (entry.amount != null || /\d/.test(entry.label)) return true;
  return section === "payments" && matchesPayment(entry.label);
}

export function buildFooterBlock(
  rows: readonly RowView[],
  index: GraphIndex,
  classified: ClassifiedGraph,
  assigned: Set<string>
): FooterBlock {
  const map = new Map(classified.nodes.map((n) => [n.id, n]));
  const charges: FooterLineEntry[] = [];
  const discounts: FooterLineEntry[] = [];
  const payments: FooterLineEntry[] = [];
  const subtotals: FooterLineEntry[] = [];
  const totals: FooterLineEntry[] = [];
  const vatSummaries: FooterLineEntry[] = [];
  const unassigned: FooterLineEntry[] = [];
  const allNodeRefs: string[] = [];

  for (const row of rows) {
    if (row.allNodeIds.some((id) => assigned.has(id))) continue;

    const section = index.sectionOfRaw(row.rawLineId);
    const lineType = index.lineSemanticTypeOfRaw(row.rawLineId);
    const kind = rowPrimaryKind(row, map);
    const inFooter = row.region === "footer";
    const isFooterKind = FOOTER_KINDS.has(kind);

    if (section === "products") {
      if (lineType === "ChargeLine" || kind === "charge") {
        const entry = buildFooterEntry(row, index, map);
        pushEntry(charges, entry, assigned);
        continue;
      }
      if (lineType === "DiscountLine" || kind === "discount") {
        const entry = buildFooterEntry(row, index, map);
        pushEntry(discounts, entry, assigned);
        continue;
      }
      continue;
    }
    if (section === "card_slip") {
      const entry = buildFooterEntry(row, index, map);
      pushEntry(unassigned, entry, assigned);
      continue;
    }

    if (!inFooter && !isFooterKind && section !== "totals" && section !== "payments" && section !== "vat_summary") {
      continue;
    }
    if (kind === "product") continue;

    const entry = buildFooterEntry(row, index, map);
    allNodeRefs.push(...entry.nodeRefs);

    switch (kind) {
      case "charge":
        pushEntry(charges, entry, assigned);
        break;
      case "discount":
        pushEntry(discounts, entry, assigned);
        break;
      case "payment": {
        if (!shouldIncludePayment(entry, section)) {
          pushEntry(unassigned, entry, assigned);
          break;
        }
        pushEntry(payments, entry, assigned);
        break;
      }
      case "subtotal":
        pushEntry(subtotals, entry, assigned);
        break;
      case "total":
        pushEntry(totals, entry, assigned);
        break;
      case "vat":
        pushEntry(vatSummaries, entry, assigned);
        break;
      default: {
        const paymentSection =
          section === "payments" ||
          (section === "totals" && matchesPayment(entry.label));
        if (paymentSection && matchesPayment(entry.label) && shouldIncludePayment(entry, section)) {
          pushEntry(payments, entry, assigned);
        } else {
          pushEntry(unassigned, entry, assigned);
        }
        break;
      }
    }
  }

  const nodeRefs = Object.freeze(Array.from(new Set(allNodeRefs)));
  const confidences = nodeRefs.map((id) => map.get(id)?.confidence ?? 0);

  return Object.freeze({
    id: "footer:main",
    kind: "footer",
    nodeRefs,
    provenance: provenanceFromNodes(nodeRefs, map),
    confidence: averageConfidence(confidences.filter((c) => c > 0)),
    charges: Object.freeze(charges),
    discounts: Object.freeze(discounts),
    payments: Object.freeze(payments),
    subtotals: Object.freeze(subtotals),
    totals: Object.freeze(totals),
    vatSummaries: Object.freeze(vatSummaries),
    unassigned: Object.freeze(unassigned),
  });
}
