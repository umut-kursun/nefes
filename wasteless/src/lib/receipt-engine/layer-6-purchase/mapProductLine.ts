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
import {
  isFuelProductBlock,
  isFuelProductLabel,
  parseFuelProductFields,
  parseMultiLineFuelBlock,
} from "./section-parsers/fuelProductParser";

export function mapProductBlock(block: ProductBlock): PurchaseLine {
  const qtyParsed = block.quantity ? parseQuantity(block.quantity) : null;
  const unitFromBlock = block.unit ? parseUnit(block.unit) : null;

  let quantity = qtyParsed?.normalized;
  let unit =
    unitFromBlock?.normalized ??
    qtyParsed?.unitNormalized ??
    undefined;
  let unitPrice = block.unitPrice ?? undefined;
  let lineTotal = block.totalPrice ?? undefined;
  let displayName = block.label;
  let fuelVatRate: number | undefined;

  if (isFuelProductBlock(block.rawLines, block.label)) {
    const fuel = parseMultiLineFuelBlock(block.rawLines, block.label);
    if (fuel.quantity !== undefined) quantity = fuel.quantity;
    if (fuel.unit) unit = fuel.unit;
    if (fuel.unitPrice !== undefined) {
      unitPrice = fuel.unitPrice;
    } else if (
      block.unitPrice != null &&
      (block.unitPrice >= 20 || quantity == null)
    ) {
      unitPrice = block.unitPrice;
    }
    if (fuel.lineTotal !== undefined && fuel.lineTotal >= 200) {
      lineTotal = fuel.lineTotal;
    } else if (quantity != null && unitPrice != null) {
      const roundedUnit = Math.round(unitPrice * 100) / 100;
      lineTotal = Math.round(quantity * roundedUnit * 100) / 100;
    } else if (block.totalPrice != null && block.totalPrice >= 200) {
      lineTotal = block.totalPrice;
    } else if (block.totalPrice != null) {
      lineTotal = block.totalPrice;
    }
    if (fuel.name) displayName = fuel.name;
    if (fuel.vatRate !== undefined) fuelVatRate = fuel.vatRate;
  } else if (isFuelProductLabel(block.label)) {
    const fuel = parseFuelProductFields(
      block.label,
      block.totalPrice,
      block.unitPrice
    );
    if (fuel.quantity !== undefined) quantity = fuel.quantity;
    if (fuel.unit) unit = fuel.unit;
    if (fuel.unitPrice !== undefined) unitPrice = fuel.unitPrice;
    if (block.totalPrice != null && block.totalPrice >= 200) {
      lineTotal = block.totalPrice;
    } else if (fuel.lineTotal !== undefined) {
      lineTotal = fuel.lineTotal;
    }
  }

  const vatParsed = block.vatToken
    ? parseVatRate(block.vatToken)
    : fuelVatRate !== undefined
      ? { raw: `×${fuelVatRate}`, normalized: fuelVatRate }
      : null;

  const line: PurchaseLine = {
    name: displayName,
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
    quantity !== undefined
      ? { ...line, quantity }
      : line;
  const withUnit = unit ? { ...withQty, unit } : withQty;
  const withUnitPrice =
    unitPrice != null ? { ...withUnit, unitPrice } : withUnit;
  const withLineTotal =
    lineTotal != null
      ? { ...withUnitPrice, lineTotal }
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
