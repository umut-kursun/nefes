import type {
  FooterLineEntry,
  ProductBlock,
} from "../types/models/blocks";
import type { PurchaseLine } from "../types/models/purchase";
import {
  parseQuantity,
  parseUnit,
  parseVatRate,
} from "./parsers";

export function mapProductBlock(block: ProductBlock): PurchaseLine {
  const qtyParsed = block.quantity ? parseQuantity(block.quantity) : null;
  const unitFromBlock = block.unit ? parseUnit(block.unit) : null;
  const unit =
    unitFromBlock?.normalized ??
    qtyParsed?.unitNormalized ??
    undefined;
  const vatParsed = block.vatToken ? parseVatRate(block.vatToken) : null;

  const line: PurchaseLine = {
    name: block.label,
    confidence: block.confidence,
    provenance: Object.freeze({
      productBlockId: block.id,
      graphNodeIds: block.provenance.graphNodeIds,
      layoutLineIndices: block.provenance.layoutLineIndices,
      rawTexts: block.provenance.rawTexts,
      ocrTexts: block.rawLines,
      classificationRules: block.provenance.classificationRules,
      confidence: block.provenance.confidence,
    }),
  };

  const withQty =
    qtyParsed?.normalized !== undefined
      ? { ...line, quantity: qtyParsed.normalized }
      : line;
  const withUnit = unit ? { ...withQty, unit } : withQty;
  const withUnitPrice =
    block.unitPrice !== null ? { ...withUnit, unitPrice: block.unitPrice } : withUnit;
  const withLineTotal =
    block.totalPrice !== null
      ? { ...withUnitPrice, lineTotal: block.totalPrice }
      : withUnitPrice;
  const withVat =
    vatParsed?.normalized !== undefined
      ? { ...withLineTotal, vatRate: vatParsed.normalized }
      : withLineTotal;

  return Object.freeze(withVat);
}

export function mapFooterEntry(
  entry: FooterLineEntry,
  footerBlockId: string
): import("../types/models/purchase").PurchaseFooterLine {
  const mapped = {
    label: entry.label,
    confidence: entry.confidence,
    provenance: Object.freeze({
      footerBlockId,
      graphNodeIds: entry.nodeRefs,
      semanticKind: entry.semanticKind,
      confidence: entry.confidence,
    }),
  };
  if (entry.amount !== null) {
    return Object.freeze({ ...mapped, amount: entry.amount });
  }
  return Object.freeze(mapped);
}
