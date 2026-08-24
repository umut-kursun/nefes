import { LineKind } from "../../tokenizer/LineKind";
import type { ParseContext, ParseResult, ReceiptParser } from "../../core/types";
import { buildProductBlocks } from "../../parser/buildProductBlocks";
import { parseProductBlocks } from "../../parser/parseProductBlocks";

const BRAND_PATTERNS: ReadonlyArray<{ pattern: RegExp; brand: string }> = [
  { pattern: /\bMcD\b|MCDONALD/i, brand: "McDonald's" },
  { pattern: /BURGER\s*KING/i, brand: "Burger King" },
  { pattern: /POPEYES/i, brand: "Popeyes" },
  { pattern: /KFC/i, brand: "KFC" },
];

function resolveFastFoodBrand(ctx: ParseContext): string | null {
  const haystack = ctx.vision.lines.slice(0, 10).join("\n");
  for (const { pattern, brand } of BRAND_PATTERNS) {
    if (pattern.test(haystack)) return brand;
  }
  return null;
}

function parseFastFoodReceipt(ctx: ParseContext): ParseResult {
  const filteredTokens = ctx.tokens.filter((token) => {
    if (token.kind === LineKind.Unknown && /^\s*\([^)]+\)\s*$/.test(token.raw)) {
      return false;
    }
    return true;
  });

  const { blocks } = buildProductBlocks(filteredTokens);
  const { products } = parseProductBlocks(blocks);

  return {
    products,
    charges: [],
    blocks,
    footer: null,
    merchantOverride: resolveFastFoodBrand(ctx),
  };
}

export const fastFoodParser: ReceiptParser = {
  id: "fast_food-v1",
  family: "fast_food",
  priority: 10,

  score(ctx: ParseContext): number {
    if (ctx.classification.family === "fast_food") {
      return Math.max(ctx.classification.confidence, 0.65);
    }

    const haystack = ctx.vision.lines.slice(0, 10).join("\n");
    if (/\bMcD\b|MCDONALD|BURGER\s*KING/i.test(haystack)) return 0.7;
    if (ctx.tokens.some((t) => /^\s*\([^)]+\)\s*$/.test(t.raw))) return 0.55;
    return 0;
  },

  parse(ctx: ParseContext) {
    return parseFastFoodReceipt(ctx);
  },
};
