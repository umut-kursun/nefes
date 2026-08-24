import type { ProductBlock } from "./ProductBlock";
import type { ParsedDiscount, ParsedProduct, ParsedProductList } from "./ParsedProduct";

const QUANTITY_LINE =
  /^\s*(\d+(?:[.,]\d+)?)\s*(AD|ADET|KG|G|LT|L|ML|PK)\.?\s+x\s+(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:[.,]\d+)?)/i;

const EMBEDDED_QTY_UNIT =
  /\b(\d+(?:[.,]\d+)?)\s+(KG|G|LT|L|ML|AD|ADET|PK)\.?\b/i;

const VAT_RATE = /%\s*(\d+(?:[.,]\d+)?)/;

const STAR_AMOUNT =
  /\*(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:[.,]\d+)?)/g;

const TAIL_AMOUNT = /\s(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;

const NAME_CUT = /\s+%\s*\d|\s+\*\s*[\d.,-]/;

function parseTurkishAmount(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, "");
  if (!s) return null;

  const negative = s.includes("-");
  s = s.replace(/-/g, "").replace(/^\*+/, "");
  if (!s) return null;

  if (/,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

function normalizeUnit(unit: string): string {
  const u = unit.toUpperCase().replace(/\./g, "");
  if (u === "AD" || u === "ADET") return "ad";
  if (u === "LT") return "lt";
  if (u === "L") return "l";
  if (u === "KG") return "kg";
  if (u === "G") return "g";
  if (u === "ML") return "ml";
  if (u === "PK") return "pk";
  return unit.toLowerCase();
}

function extractVatRate(productLine: string): number | null {
  const match = productLine.match(VAT_RATE);
  if (!match?.[1]) return null;
  const rate = parseTurkishAmount(match[1].replace(",", "."));
  return rate;
}

function extractLineTotal(productLine: string): number | null {
  const starMatches = [...productLine.matchAll(STAR_AMOUNT)];
  if (starMatches.length > 0) {
    const last = starMatches[starMatches.length - 1]?.[1];
    return last ? parseTurkishAmount(last) : null;
  }
  const tail = productLine.match(TAIL_AMOUNT);
  return tail?.[1] ? parseTurkishAmount(tail[1]) : null;
}

function stripEmbeddedQuantitySuffix(name: string): string {
  return name.replace(EMBEDDED_QTY_UNIT, "").replace(/\s+/g, " ").trim();
}

function extractRawName(productLine: string): string {
  let name = productLine.trim().replace(/^\*+\s*/, "");
  const cut = name.search(NAME_CUT);
  if (cut >= 0) {
    name = name.slice(0, cut);
  }
  return stripEmbeddedQuantitySuffix(name);
}

function extractEmbeddedQuantityUnit(productLine: string): {
  quantity: number | null;
  unit: string | null;
} {
  const prePrice = (() => {
    const cut = productLine.search(NAME_CUT);
    return cut >= 0 ? productLine.slice(0, cut) : productLine;
  })();

  const match = prePrice.match(EMBEDDED_QTY_UNIT);
  if (!match?.[1] || !match[2]) {
    return { quantity: null, unit: null };
  }

  const quantity = parseTurkishAmount(match[1]);
  return {
    quantity,
    unit: normalizeUnit(match[2]),
  };
}

function parseQuantityLine(quantityLine: string): {
  quantity: number;
  unit: string;
  unitPrice: number;
} | null {
  const match = quantityLine.match(QUANTITY_LINE);
  if (!match?.[1] || !match[2] || !match[3]) return null;

  const quantity = parseTurkishAmount(match[1]);
  const unitPrice = parseTurkishAmount(match[3]);
  if (quantity == null || unitPrice == null) return null;

  return {
    quantity,
    unit: normalizeUnit(match[2]),
    unitPrice,
  };
}

function parseDiscountLine(rawText: string): ParsedDiscount | null {
  const starMatches = [...rawText.matchAll(STAR_AMOUNT)];
  const amountToken =
    starMatches.length > 0
      ? starMatches[starMatches.length - 1]?.[1]
      : null;

  if (!amountToken) return null;
  const amount = parseTurkishAmount(amountToken);
  if (amount == null) return null;

  return { rawText, amount };
}

/** Parse one ProductBlock into one ParsedProduct — block-local regex only. */
export function parseProductBlock(block: ProductBlock): ParsedProduct {
  const vatRate = extractVatRate(block.productLine);
  const lineTotal = extractLineTotal(block.productLine);
  const rawName = extractRawName(block.productLine);

  const quantityFromLine = block.quantityLine
    ? parseQuantityLine(block.quantityLine)
    : null;

  const embedded = extractEmbeddedQuantityUnit(block.productLine);

  const quantity =
    quantityFromLine?.quantity ??
    embedded.quantity ??
    1;

  const unit =
    quantityFromLine?.unit ??
    embedded.unit ??
    "ad";

  let unitPrice: number | null = quantityFromLine?.unitPrice ?? null;
  if (unitPrice == null && quantity === 1 && lineTotal != null) {
    unitPrice = lineTotal;
  }

  const discounts: ParsedDiscount[] = [];
  for (const line of block.discountLines) {
    const parsed = parseDiscountLine(line);
    if (parsed) discounts.push(parsed);
  }

  return {
    rawName,
    quantity,
    unit,
    unitPrice,
    lineTotal,
    vatRate,
    discounts,
  };
}

export function parseProductBlocks(
  blocks: readonly ProductBlock[]
): ParsedProductList {
  return {
    products: blocks.map(parseProductBlock),
  };
}
