import type { ParseContext, ParseResult, ReceiptParser } from "../../core/types";
import { parseGenericReceipt } from "../generic/parseGenericReceipt";

export const retailParser: ReceiptParser = {
  id: "retail-v1",
  family: "retail",
  priority: 7,

  score(ctx: ParseContext): number {
    if (ctx.classification.family === "retail") {
      return Math.max(ctx.classification.confidence, 0.55);
    }

    const haystack = [
      ctx.vision.merchant?.rawName ?? "",
      ...ctx.vision.lines.slice(0, 4),
    ].join("\n");

    if (/LCW|LC\s*WAIKIKI|TOYZZ|MAĞAZA|GİYİM|GIYIM/i.test(haystack)) return 0.6;
    return 0;
  },

  parse(ctx: ParseContext): ParseResult {
    return parseGenericReceipt(ctx);
  },
};
