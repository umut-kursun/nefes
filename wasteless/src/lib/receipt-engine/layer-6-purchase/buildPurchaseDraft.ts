import type { BlockDocument } from "../types/models/blocks";
import type { PurchaseDraft, PurchaseLine } from "../types/models/purchase";
import { mapMetadataBlock } from "./mapMetadata";
import { mapFooterEntry, mapProductBlock } from "./mapProductLine";
import { isFuelProductBlock } from "./section-parsers/fuelProductParser";
import type { ParsedField } from "../types/models/purchase";
import {
  extractInlineAmount,
  isBankIssuerOnlyLine,
  stripAmountFromLabel,
} from "../patterns/lineSanitize";

function inferTurkishCurrency(doc: BlockDocument): ParsedField<string> | null {
  const blob = [
    doc.metadata.merchant ?? "",
    ...doc.metadata.provenance.rawTexts,
    ...doc.footer.provenance.rawTexts,
    ...doc.products.flatMap((p) => p.provenance.rawTexts),
  ].join("\n");
  if (/\b(tl|₺|try|vkn|vd\.|mersis|türkiye|turkiye|istanbul|ankara)\b/i.test(blob)) {
    return Object.freeze({ raw: "TRY", normalized: "TRY" });
  }
  return null;
}

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

/** OCR litre qty drift vs footer total — snap single fuel lines when close. */
function alignFuelLineTotalWithReceipt(
  products: readonly PurchaseLine[],
  receiptTotal: number | null | undefined
): readonly PurchaseLine[] {
  if (receiptTotal == null || products.length !== 1) return products;
  const line = products[0]!;
  const isFuel = isFuelProductBlock(
    line.provenance.ocrTexts,
    line.name
  );
  if (!isFuel || line.lineTotal == null) return products;
  const diff = Math.abs(line.lineTotal - receiptTotal);
  if (diff > 0 && diff <= 1.5) {
    return Object.freeze([Object.freeze({ ...line, lineTotal: receiptTotal })]);
  }
  return products;
}

/** Collapse split fuel OCR rows (qty line + orphan vat line) into a single product. */
function collapseFuelProducts(products: readonly PurchaseLine[]): readonly PurchaseLine[] {
  if (products.length <= 1) return products;
  const fuelLines = products.filter((p) =>
    isFuelProductBlock(p.provenance.ocrTexts, p.name)
  );
  if (fuelLines.length <= 1) return products;
  const named = fuelLines.find((p) => /motorin|benzin|dizel|lpg/i.test(p.name));
  const withQty = fuelLines.find((p) => p.quantity != null && p.unit === "LT");
  const anchor = named ?? withQty ?? fuelLines[0]!;
  const merged = Object.freeze({
    ...anchor,
    quantity: withQty?.quantity ?? anchor.quantity,
    unit: withQty?.unit ?? anchor.unit,
    unitPrice: withQty?.unitPrice ?? anchor.unitPrice,
    lineTotal:
      fuelLines.find((p) => p.lineTotal != null && (p.lineTotal ?? 0) >= 200)
        ?.lineTotal ?? anchor.lineTotal,
    vatRate:
      fuelLines.find((p) => p.vatRate != null)?.vatRate ?? anchor.vatRate,
  });
  const nonFuel = products.filter(
    (p) => !isFuelProductBlock(p.provenance.ocrTexts, p.name)
  );
  return Object.freeze([merged, ...nonFuel]);
}

export function buildPurchaseDraft(doc: BlockDocument): PurchaseDraft {
  const meta = mapMetadataBlock(doc.metadata);
  const footerId = doc.footer.id;

  const products = Object.freeze(
    alignFuelLineTotalWithReceipt(
      collapseFuelProducts(doc.products.map(mapProductBlock)),
      doc.footer.totals[0]?.amount ?? null
    )
  );
  const charges = Object.freeze(
    doc.footer.charges.map((e) => mapFooterEntry(e, footerId))
  );
  const discounts = Object.freeze(
    doc.footer.discounts.map((e) => mapFooterEntry(e, footerId))
  );
  const subtotal =
    doc.footer.subtotals.length > 0
      ? mapFooterEntry(doc.footer.subtotals[0]!, footerId)
      : null;
  const total =
    doc.footer.totals.length > 0
      ? mapFooterEntry(doc.footer.totals[0]!, footerId)
      : null;
  const payments = Object.freeze(
    doc.footer.payments.map((e) => mapFooterEntry(e, footerId))
  );
  const paymentsWithAmount = Object.freeze(
    payments
      .map((p) => {
        let amount = p.amount;
        let label = p.label;
        if (amount == null) {
          const inline = extractInlineAmount(label);
          if (inline != null) {
            amount = inline;
            label = stripAmountFromLabel(label);
          }
        }
        if (amount == null && total?.amount != null && payments.length === 1) {
          amount = total.amount;
        }
        if (isBankIssuerOnlyLine(label) && amount == null) return null;
        return Object.freeze({ ...p, amount, label });
      })
      .filter((p): p is NonNullable<typeof p> => p != null)
  );
  const vatSummary = Object.freeze(
    doc.footer.vatSummaries.map((e) => mapFooterEntry(e, footerId))
  );

  return Object.freeze({
    merchant: meta.merchant,
    purchaseDate: meta.purchaseDate,
    purchaseTime: meta.purchaseTime,
    receiptNumber: meta.receiptNumber,
    currency: meta.currency ?? inferTurkishCurrency(doc),
    products,
    charges,
    discounts,
    payments: paymentsWithAmount,
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
