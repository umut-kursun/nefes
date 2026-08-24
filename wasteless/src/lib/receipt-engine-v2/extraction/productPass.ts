import type { ParsedCharge } from "../core/types";
import type { ParsedDiscount } from "../parser/ParsedProduct";
import { isPollutedProductName } from "@/lib/receipt-accuracy-contract/patterns";
import { assignLineRoles } from "./assignLineRoles";
import { LineRole, type RoleAnnotatedLine } from "./LineRole";
import {
  CHARGE_LINE,
  DISCOUNT_SECTION,
  extractInlineVatRate,
  extractStarAmounts,
  extractTrailingAmount,
  FUEL_PRODUCT,
  FUEL_QTY_LINE,
  PLATE_LINE,
  lastStarAmount,
  TOTAL_LABEL,
  VAT_LABEL,
  BARE_AMOUNT_LINE,
  VAT_ONLY_LINE,
} from "./linePatterns";
import type { ParsedProductWithProvenance, ProductProvenance } from "./types";

function productConfidence(parts: { hasName: boolean; hasPrice: boolean; hasVat: boolean }): number {
  let score = 0.55;
  if (parts.hasName) score += 0.2;
  if (parts.hasPrice) score += 0.15;
  if (parts.hasVat) score += 0.08;
  return Math.min(0.97, score);
}

function stripVatFromName(name: string): string {
  return name
    .replace(/\*[\d.,\-]+/g, "")
    .replace(/\s*%\s*\d+(?:[.,]\d+)?\s*/g, " ")
    .replace(/\s+\d{1,3}(?:\.\d{3})*,\d{2}\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isDiscountLine(raw: string): boolean {
  return /(?:[İI]ND[İI]R[İI]M|INDIRIM|\*SEC|\*-\d|-\d{1,3}(?:\.\d{3})*,\d{2})/i.test(raw);
}

function isEmittableProductName(name: string): boolean {
  const clean = stripVatFromName(name);
  if (clean.length < 2) return false;
  if (isPollutedProductName(clean)) return false;
  if (/^%\s*\d/.test(clean)) return false;
  if (/^\*[\d.,\-]+$/.test(clean)) return false;
  return true;
}

function roleAllowsProductProcessing(role: LineRole): boolean {
  return role === LineRole.BodyProduct;
}

export type ProductExtraction = {
  products: ParsedProductWithProvenance[];
  charges: ParsedCharge[];
  discounts: ParsedDiscount[];
  productEndIndex: number;
};

export function extractProductsBeforeFooter(
  lines: readonly string[],
  footerStartIndex: number,
  roles?: readonly RoleAnnotatedLine[]
): ProductExtraction {
  const lineRoles = roles ?? assignLineRoles(lines, footerStartIndex);
  const roleAt = (index: number) => lineRoles[index]?.role ?? LineRole.Ignore;

  const products: ParsedProductWithProvenance[] = [];
  const charges: ParsedCharge[] = [];
  const discounts: ParsedDiscount[] = [];
  let inDiscountSection = false;
  let pendingName: { text: string; lineIndex: number; vatRate: number | null } | null =
    null;
  let productEndIndex = footerStartIndex;

  for (let i = 0; i < footerStartIndex; i++) {
    const raw = (lines[i] ?? "").trim();
    if (!raw) continue;

    const role = roleAt(i);

    if (DISCOUNT_SECTION.test(raw)) {
      pendingName = null;
      inDiscountSection = true;
      productEndIndex = Math.min(productEndIndex, i);
      continue;
    }

    if (inDiscountSection) {
      if (VAT_LABEL.test(raw) || TOTAL_LABEL.test(raw)) break;
      const amount = lastStarAmount(raw);
      if (amount != null && amount < 0) {
        discounts.push({ rawText: raw, amount });
      } else if (amount != null && isDiscountLine(raw)) {
        discounts.push({ rawText: raw, amount: amount < 0 ? amount : -Math.abs(amount) });
      }
      continue;
    }

    if (VAT_ONLY_LINE.test(raw) && pendingName) {
      pendingName = {
        text: pendingName.text,
        lineIndex: pendingName.lineIndex,
        vatRate: extractInlineVatRate(raw),
      };
      continue;
    }

    if (BARE_AMOUNT_LINE.test(raw) && pendingName) {
      const amount = lastStarAmount(raw);
      if (amount != null && isEmittableProductName(pendingName.text)) {
        products.push(
          buildProduct(
            pendingName.text,
            amount,
            pendingName.vatRate ?? extractInlineVatRate(raw),
            [pendingName.lineIndex, i]
          )
        );
        pendingName = null;
      }
      continue;
    }

    if (FUEL_QTY_LINE.test(raw)) {
      continue;
    }

    if (!roleAllowsProductProcessing(role)) {
      if (
        role === LineRole.FooterTotal ||
        role === LineRole.FooterVat ||
        role === LineRole.FooterPayment
      ) {
        productEndIndex = Math.min(productEndIndex, i);
        break;
      }
      continue;
    }

    if (BARE_AMOUNT_LINE.test(raw) && pendingName) {
      const amount = lastStarAmount(raw);
      if (amount != null && isEmittableProductName(pendingName.text)) {
        products.push(
          buildProduct(
            pendingName.text,
            amount,
            pendingName.vatRate ?? extractInlineVatRate(raw),
            [pendingName.lineIndex, i]
          )
        );
        pendingName = null;
      }
      continue;
    }

    const starAmount = extractTrailingAmount(raw);
    const vatRate = extractInlineVatRate(raw);
    const hasStar = starAmount != null;
    const namePart = stripVatFromName(raw.replace(/\*[\d.,\-]+/g, "").trim());

    if (CHARGE_LINE.test(raw) && hasStar) {
      charges.push({
        rawName: namePart || raw,
        amount: starAmount!,
        vatRate,
      });
      pendingName = null;
      continue;
    }

    if (FUEL_PRODUCT.test(raw) && !hasStar && pendingName == null) {
      if (isEmittableProductName(raw)) {
        pendingName = { text: raw, lineIndex: i, vatRate: null };
      }
      continue;
    }

    if (pendingName && hasStar && !namePart && vatRate == null) {
      if (isEmittableProductName(pendingName.text)) {
        products.push(
          buildProduct(pendingName.text, starAmount, vatRate, [pendingName.lineIndex, i])
        );
      }
      pendingName = null;
      continue;
    }

    if (pendingName && (hasStar || vatRate != null)) {
      if (namePart.length >= 3 && isEmittableProductName(namePart)) {
        products.push(buildProduct(namePart, starAmount, vatRate, [i]));
      } else if (isEmittableProductName(pendingName.text)) {
        products.push(
          buildProduct(pendingName.text, starAmount, vatRate ?? pendingName.vatRate, [
            pendingName.lineIndex,
            i,
          ])
        );
      }
      pendingName = null;
      continue;
    }

    if (hasStar || (vatRate != null && namePart.length >= 2)) {
      if (isEmittableProductName(namePart || raw)) {
        products.push(buildProduct(namePart || raw, starAmount, vatRate, [i]));
        pendingName = null;
      }
      continue;
    }

    if (namePart.length >= 2 && !/^\d+$/.test(namePart) && isEmittableProductName(namePart)) {
      pendingName = { text: namePart, lineIndex: i, vatRate: vatRate ?? null };
    }
  }

  pendingName = null;

  return { products, charges, discounts, productEndIndex };
}

function buildProduct(
  rawName: string,
  lineTotal: number | null,
  vatRate: number | null,
  sourceLineIndices: number[],
  nameOnly = false
): ParsedProductWithProvenance {
  const cleanName = stripVatFromName(rawName);
  const isVatOnlyName = /^%\s*\d+/.test(cleanName);
  const name = isVatOnlyName ? "" : cleanName;

  const provenance: ProductProvenance = {
    sourceLineIndices,
    method: nameOnly ? "semantic:product-name-only" : "semantic:product-line",
    confidence: productConfidence({
      hasName: name.length >= 2,
      hasPrice: lineTotal != null,
      hasVat: vatRate != null,
    }),
  };

  return {
    rawName: name || rawName,
    quantity: 1,
    unit: "",
    unitPrice: lineTotal,
    lineTotal,
    vatRate,
    discounts: [],
    provenance,
  };
}

export function extractFuelMetadata(
  lines: readonly string[],
  footerStartIndex: number
): {
  fuelType: string | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  lineTotal: number | null;
  plateNumber: string | null;
  sourceLineIndices: number[];
} {
  let fuelType: string | null = null;
  let quantity: number | null = null;
  let unit: string | null = null;
  let unitPrice: number | null = null;
  let lineTotal: number | null = null;
  let plateNumber: string | null = null;
  const sourceLineIndices: number[] = [];

  for (let i = 0; i < footerStartIndex; i++) {
    const raw = lines[i] ?? "";
    const plateMatch = raw.match(PLATE_LINE);
    if (plateMatch?.[1] && raw.length < 25) {
      plateNumber = plateMatch[1].replace(/\s+/g, " ").trim();
      sourceLineIndices.push(i);
    }

    const qtyMatch = raw.match(FUEL_QTY_LINE);
    if (qtyMatch) {
      quantity = parseTurkishQty(qtyMatch[1]!);
      unitPrice = parseTurkishPrice(qtyMatch[2]!);
      unit = "LT";
      sourceLineIndices.push(i);
    }

    if (FUEL_PRODUCT.test(raw)) {
      fuelType = raw.match(FUEL_PRODUCT)?.[0] ?? raw.trim();
      sourceLineIndices.push(i);
    }

    if (fuelType && /^\s*%\s*\d+/.test(raw)) {
      sourceLineIndices.push(i);
    }

    if (fuelType && extractStarAmounts(raw).length === 1 && !FUEL_QTY_LINE.test(raw)) {
      lineTotal = lastStarAmount(raw);
      sourceLineIndices.push(i);
    }
  }

  return {
    fuelType,
    quantity,
    unit,
    unitPrice,
    lineTotal,
    plateNumber,
    sourceLineIndices: [...new Set(sourceLineIndices)],
  };
}

function parseTurkishQty(raw: string): number {
  return Number(raw.replace(",", "."));
}

function parseTurkishPrice(raw: string): number {
  if (raw.includes(".") && raw.includes(",")) {
    return Number(raw.replace(/\./g, "").replace(",", "."));
  }
  if (raw.includes(",")) return Number(raw.replace(",", "."));
  return Number(raw);
}
