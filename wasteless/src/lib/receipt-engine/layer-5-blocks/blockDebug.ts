import type { Block, BlockDocument } from "../types/models/blocks";

export interface BlockInspection {
  block: Block;
  nodeRefCount: number;
  layoutLineIndices: readonly number[];
  rawTexts: readonly string[];
  classificationRules: readonly string[];
  confidence: number;
}

export function inspectBlock(
  document: BlockDocument,
  blockId: string
): BlockInspection | null {
  const all: Block[] = [
    ...document.products,
    document.footer,
    document.metadata,
    document.unknown,
  ];
  const block = all.find((item) => item.id === blockId);
  if (!block) return null;

  return {
    block,
    nodeRefCount: block.nodeRefs.length,
    layoutLineIndices: block.provenance.layoutLineIndices,
    rawTexts: block.provenance.rawTexts,
    classificationRules: block.provenance.classificationRules,
    confidence: block.confidence,
  };
}

export function formatBlockDebug(document: BlockDocument): string {
  const lines = [
    `BlockDocument confidence=${document.confidence.toFixed(2)}`,
    `  products=${document.products.length}`,
    `  footer charges=${document.footer.charges.length} payments=${document.footer.payments.length} totals=${document.footer.totals.length}`,
    `  metadata merchant=${document.metadata.merchant ?? "(none)"}`,
    `  unknown entries=${document.unknown.entries.length}`,
    "",
    "product blocks:",
  ];

  for (const product of document.products) {
    lines.push(
      `  [product] ${product.id} "${product.label}" total=${product.totalPrice} conf=${product.confidence.toFixed(2)} nodes=${product.nodeRefs.length}`
    );
  }

  lines.push("", "footer:");
  for (const entry of [
    ...document.footer.totals,
    ...document.footer.payments,
    ...document.footer.charges,
  ]) {
    lines.push(
      `  [${entry.semanticKind}] "${entry.label}" ${entry.amount ?? "-"} nodes=${entry.nodeRefs.length}`
    );
  }

  lines.push("", "metadata:");
  if (document.metadata.merchant) {
    lines.push(`  merchant="${document.metadata.merchant}"`);
  }

  lines.push("", "unknown:");
  for (const entry of document.unknown.entries) {
    lines.push(`  [${entry.semanticKind}] ${entry.nodeRef} "${entry.text}"`);
  }

  return lines.join("\n");
}

export function blockDocumentToJson(document: BlockDocument): string {
  return JSON.stringify(document, null, 2);
}
