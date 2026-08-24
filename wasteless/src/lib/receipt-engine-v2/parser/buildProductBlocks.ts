import { LineKind } from "../tokenizer/LineKind";
import type { TokenizedLine } from "../tokenizer/TokenizedLine";
import type { ProductBlock, ProductBlockBuildResult } from "./ProductBlock";

const PRODUCT_SECTION_TERMINATORS: ReadonlySet<LineKind> = new Set([
  LineKind.Subtotal,
  LineKind.VatTotal,
  LineKind.GrandTotal,
  LineKind.PaymentHeader,
  LineKind.PaymentAmount,
  LineKind.Footer,
]);

function isProductSectionTerminator(kind: LineKind): boolean {
  return PRODUCT_SECTION_TERMINATORS.has(kind);
}

function createBlock(productLine: string): ProductBlock {
  return {
    productLine,
    quantityLine: null,
    discountLines: [],
  };
}

function appendDiscount(block: ProductBlock, discountLine: string): ProductBlock {
  return {
    ...block,
    discountLines: [...block.discountLines, discountLine],
  };
}

function withQuantityLine(block: ProductBlock, quantityLine: string): ProductBlock {
  return {
    ...block,
    quantityLine,
  };
}

function replaceLastBlock(blocks: ProductBlock[], block: ProductBlock): void {
  blocks[blocks.length - 1] = block;
}

/**
 * Group tokenized OCR lines into product blocks.
 *
 * State machine:
 * - `product_candidate` opens a new block.
 * - Following `quantity_detail` / `discount_candidate` lines belong to that block.
 * - Footer, payment, and summary lines end the product section.
 */
export function buildProductBlocks(
  lines: readonly TokenizedLine[]
): ProductBlockBuildResult {
  const blocks: ProductBlock[] = [];
  let current: ProductBlock | null = null;

  for (const line of lines) {
    if (isProductSectionTerminator(line.kind)) {
      break;
    }

    switch (line.kind) {
      case LineKind.ProductCandidate: {
        current = createBlock(line.raw);
        blocks.push(current);
        break;
      }
      case LineKind.QuantityDetail: {
        if (!current) break;
        current = withQuantityLine(current, line.raw);
        replaceLastBlock(blocks, current);
        break;
      }
      case LineKind.DiscountCandidate: {
        if (!current) break;
        current = appendDiscount(current, line.raw);
        replaceLastBlock(blocks, current);
        break;
      }
      default:
        break;
    }
  }

  return { blocks };
}

export { PRODUCT_SECTION_TERMINATORS, isProductSectionTerminator };
