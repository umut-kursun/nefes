import type { ParsedCharge } from "../core/types";
import type { ParsedDiscount } from "../parser/ParsedProduct";
import { assignLineRoles } from "./assignLineRoles";
import { extractFooterFirst } from "./footerFirstPass";
import {
  extractFuelMetadata,
  extractProductsBeforeFooter,
} from "./productPass";
import type { ExtractedFuel, ReceiptDocument } from "./types";

export function extractReceiptDocument(lines: readonly string[]): ReceiptDocument {
  const start = Date.now();
  const footerResult = extractFooterFirst(lines);
  const lineRoles = assignLineRoles(lines, footerResult.footerStartIndex);
  const productResult = extractProductsBeforeFooter(
    lines,
    footerResult.footerStartIndex,
    lineRoles
  );
  const fuelRaw = extractFuelMetadata(lines, footerResult.footerStartIndex);

  const fuel: ExtractedFuel | null =
    fuelRaw.fuelType || fuelRaw.quantity
      ? {
          fuelType: fuelRaw.fuelType,
          quantity: fuelRaw.quantity,
          unit: fuelRaw.unit,
          unitPrice: fuelRaw.unitPrice,
          lineTotal: fuelRaw.lineTotal,
          plateNumber: fuelRaw.plateNumber,
          provenance: {
            value: fuelRaw.lineTotal,
            confidence: fuelRaw.sourceLineIndices.length >= 2 ? 0.9 : 0.75,
            sourceLineIndices: fuelRaw.sourceLineIndices,
            method: "semantic:fuel",
          },
        }
      : null;

  let products = productResult.products;
  const charges: readonly ParsedCharge[] = productResult.charges;

  if (fuel?.fuelType) {
    const fuelTotal = fuel.lineTotal ?? footerResult.footer.total;
    const fuelProductIndex = products.findIndex((p) =>
      /MOTOR|BENZ|DIZEL|DİZEL|LPG|DIESEL/i.test(p.rawName)
    );
    if (fuelProductIndex >= 0) {
      const existing = products[fuelProductIndex]!;
      const updated = {
        ...existing,
        quantity: fuel.quantity ?? existing.quantity,
        unit: fuel.unit ?? existing.unit ?? "LT",
        unitPrice: fuel.unitPrice ?? existing.unitPrice,
        lineTotal: fuelTotal ?? existing.lineTotal,
        provenance: {
          ...existing.provenance,
          method: "semantic:fuel-merge",
          confidence: Math.max(existing.provenance.confidence, fuel.provenance.confidence),
        },
      };
      products = [
        ...products.slice(0, fuelProductIndex),
        updated,
        ...products.slice(fuelProductIndex + 1),
      ];
    } else if (fuelTotal != null) {
      products = [
        {
          rawName: fuel.fuelType,
          quantity: fuel.quantity ?? 1,
          unit: fuel.unit ?? "LT",
          unitPrice: fuel.unitPrice,
          lineTotal: fuelTotal,
          vatRate: null,
          discounts: [],
          provenance: {
            sourceLineIndices: fuel.provenance.sourceLineIndices,
            method: "semantic:fuel-product",
            confidence: fuel.provenance.confidence,
          },
        },
      ];
    }
  }

  const discounts: ParsedDiscount[] = [...productResult.discounts];

  return {
    rawLines: lines,
    products,
    charges,
    discounts,
    footer: footerResult.footer,
    fuel,
    footerStartIndex: footerResult.footerStartIndex,
    extractionMs: Date.now() - start,
    vatProvenance: footerResult.vatProvenance,
    totalProvenance: footerResult.totalProvenance,
    subtotalProvenance: footerResult.subtotalProvenance,
  };
}

export type { FooterExtraction } from "./footerFirstPass";
export type { ProductExtraction } from "./productPass";
