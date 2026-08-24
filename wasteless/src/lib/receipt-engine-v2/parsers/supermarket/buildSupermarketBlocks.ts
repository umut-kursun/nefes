import { LineKind } from "../../tokenizer/LineKind";
import type { TokenizedLine } from "../../tokenizer/TokenizedLine";
import type { ProductBlock } from "../../parser/ProductBlock";
import { PRODUCT_SECTION_TERMINATORS, isProductSectionTerminator } from "../../parser/buildProductBlocks";
import { amountsClose, parseTurkishAmount } from "../../core/parseTurkishAmount";

const STAR_AMOUNT = /\*(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:[.,]\d+)?)/g;

const QUANTITY_LINE =
  /^\s*(\d+(?:[.,]\d+)?)\s*(AD|ADET|KG|G|LT|L|ML|PK)\.?\s+x\s+(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:[.,]\d+)?)/i;

function extractLineTotal(productLine: string): number | null {
  const starMatches = [...productLine.matchAll(STAR_AMOUNT)];
  if (starMatches.length > 0) {
    const last = starMatches[starMatches.length - 1]?.[1];
    return last ? parseTurkishAmount(last) : null;
  }
  return null;
}

function parseQuantityLine(quantityLine: string): {
  quantity: number;
  unitPrice: number;
} | null {
  const match = quantityLine.match(QUANTITY_LINE);
  if (!match?.[1] || !match[3]) return null;
  const quantity = parseTurkishAmount(match[1]);
  const unitPrice = parseTurkishAmount(match[3]);
  if (quantity == null || unitPrice == null) return null;
  return { quantity, unitPrice };
}

function createBlock(productLine: string): ProductBlock {
  return { productLine, quantityLine: null, discountLines: [] };
}

function withQuantityLine(block: ProductBlock, quantityLine: string): ProductBlock {
  return { ...block, quantityLine };
}

function appendDiscount(block: ProductBlock, discountLine: string): ProductBlock {
  return { ...block, discountLines: [...block.discountLines, discountLine] };
}

function replaceLastBlock(blocks: ProductBlock[], block: ProductBlock): void {
  blocks[blocks.length - 1] = block;
}

/**
 * Supermarket layout: qty lines may belong to the NEXT product when
 * qty × unitPrice ≈ next line total (Migros interleaved weighted items).
 */
export function buildSupermarketBlocks(
  lines: readonly TokenizedLine[]
): ProductBlock[] {
  const blocks: ProductBlock[] = [];
  let current: ProductBlock | null = null;
  const pendingQty: string[] = [];

  function openProductBlock(productLine: string) {
    current = createBlock(productLine);
    blocks.push(current);

    if (pendingQty.length > 0) {
      const qtyLine = pendingQty[0]!;
      const parsed = parseQuantityLine(qtyLine);
      const lineTotal = extractLineTotal(productLine);
      if (
        parsed &&
        lineTotal != null &&
        amountsClose(parsed.quantity * parsed.unitPrice, lineTotal)
      ) {
        current = withQuantityLine(current, pendingQty.shift()!);
        replaceLastBlock(blocks, current);
      }
    }
  }

  for (const line of lines) {
    if (isProductSectionTerminator(line.kind)) break;

    switch (line.kind) {
      case LineKind.ProductCandidate:
        openProductBlock(line.raw);
        break;
      case LineKind.QuantityDetail: {
        const qtyLine = line.raw;
        const parsed = parseQuantityLine(qtyLine);
        if (!parsed) {
          if (current) {
            replaceLastBlock(blocks, withQuantityLine(current, qtyLine));
            current = blocks[blocks.length - 1]!;
          }
          break;
        }

        const impliedTotal = parsed.quantity * parsed.unitPrice;
        if (current) {
          const currentTotal = extractLineTotal(current.productLine);
          if (amountsClose(impliedTotal, currentTotal)) {
            replaceLastBlock(blocks, withQuantityLine(current, qtyLine));
            current = blocks[blocks.length - 1]!;
            break;
          }
        }

        pendingQty.push(qtyLine);
        break;
      }
      case LineKind.DiscountCandidate:
        if (current) {
          replaceLastBlock(blocks, appendDiscount(current, line.raw));
          current = blocks[blocks.length - 1]!;
        }
        break;
      default:
        break;
    }
  }

  return blocks;
}

export { PRODUCT_SECTION_TERMINATORS, isProductSectionTerminator };
