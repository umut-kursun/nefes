import { LineKind } from "../../tokenizer/LineKind";
import { parseProductBlocks } from "../../parser/parseProductBlocks";
import type { ParsedCharge, ParseContext, ParseResult, ReceiptParser } from "../../core/types";
import { parseTurkishAmount } from "../../core/parseTurkishAmount";
import { buildSupermarketBlocks } from "./buildSupermarketBlocks";

const STAR_AMOUNT = /\*(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:[.,]\d+)?)/g;
const VAT_RATE = /%\s*(\d+(?:[.,]\d+)?)/;

function extractCharges(ctx: ParseContext): ParsedCharge[] {
  const charges: ParsedCharge[] = [];

  for (const token of ctx.tokens) {
    if (token.kind !== LineKind.ChargeCandidate) continue;
    const starMatches = [...token.raw.matchAll(STAR_AMOUNT)];
    const amountToken = starMatches[starMatches.length - 1]?.[1];
    const amount = amountToken ? parseTurkishAmount(amountToken) : null;
    if (amount == null) continue;

    const vatMatch = token.raw.match(VAT_RATE);
    const vatRate = vatMatch?.[1]
      ? parseTurkishAmount(vatMatch[1].replace(",", "."))
      : null;

    const rawName = token.raw
      .replace(STAR_AMOUNT, "")
      .replace(VAT_RATE, "")
      .replace(/\s+/g, " ")
      .trim();

    charges.push({ rawName, amount, vatRate });
  }

  return charges;
}

function parseSupermarketReceipt(ctx: ParseContext): ParseResult {
  const blocks = buildSupermarketBlocks(ctx.tokens);
  const { products } = parseProductBlocks(blocks);
  const charges = extractCharges(ctx);

  return {
    products,
    charges,
    blocks,
    footer: null,
    merchantOverride: null,
  };
}

export const supermarketParser: ReceiptParser = {
  id: "supermarket-v1",
  family: "supermarket",
  priority: 10,

  score(ctx: ParseContext): number {
    if (ctx.classification.family === "supermarket") {
      return Math.max(ctx.classification.confidence, 0.65);
    }

    const merchantHaystack = [
      ctx.vision.merchant?.rawName ?? "",
      ...ctx.vision.lines.slice(0, 4),
    ].join("\n");

    if (/\bMIGROS\b|\bB[İI]M\b|\bA101\b|\bCARREFOUR/i.test(merchantHaystack)) {
      return 0.7;
    }

    return 0;
  },

  parse(ctx: ParseContext) {
    return parseSupermarketReceipt(ctx);
  },
};
