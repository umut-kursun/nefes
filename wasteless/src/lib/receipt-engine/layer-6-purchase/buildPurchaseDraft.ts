import type { BlockDocument } from "../types/models/blocks";
import type { PurchaseDraft } from "../types/models/purchase";
import { mapMetadataBlock } from "./mapMetadata";
import { mapFooterEntry, mapProductBlock } from "./mapProductLine";

function collectRawTexts(doc: BlockDocument): readonly string[] {
  const texts = new Set<string>();
  for (const p of doc.products) {
    for (const t of p.provenance.rawTexts) texts.add(t);
  }
  for (const t of doc.footer.provenance.rawTexts) texts.add(t);
  for (const t of doc.metadata.provenance.rawTexts) texts.add(t);
  for (const t of doc.unknown.provenance.rawTexts) texts.add(t);
  return Object.freeze(Array.from(texts));
}

export function buildPurchaseDraft(doc: BlockDocument): PurchaseDraft {
  const meta = mapMetadataBlock(doc.metadata);
  const footerId = doc.footer.id;

  const products = Object.freeze(doc.products.map(mapProductBlock));
  const charges = Object.freeze(
    doc.footer.charges.map((e) => mapFooterEntry(e, footerId))
  );
  const discounts = Object.freeze(
    doc.footer.discounts.map((e) => mapFooterEntry(e, footerId))
  );
  const payments = Object.freeze(
    doc.footer.payments.map((e) => mapFooterEntry(e, footerId))
  );
  const vatSummary = Object.freeze(
    doc.footer.vatSummaries.map((e) => mapFooterEntry(e, footerId))
  );

  const subtotal =
    doc.footer.subtotals.length > 0
      ? mapFooterEntry(doc.footer.subtotals[0]!, footerId)
      : null;
  const total =
    doc.footer.totals.length > 0
      ? mapFooterEntry(doc.footer.totals[0]!, footerId)
      : null;

  return Object.freeze({
    merchant: meta.merchant,
    purchaseDate: meta.purchaseDate,
    purchaseTime: meta.purchaseTime,
    receiptNumber: meta.receiptNumber,
    currency: meta.currency,
    products,
    charges,
    discounts,
    payments,
    vatSummary,
    subtotal,
    total,
    confidence: doc.confidence,
    provenance: Object.freeze({
      metadataBlockId: doc.metadata.id,
      footerBlockId: footerId,
      blockDocumentConfidence: doc.confidence,
      rawTexts: collectRawTexts(doc),
    }),
  });
}
