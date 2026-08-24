import type { ParseContext, ReceiptParser } from "../../core/types";
import { parseGenericReceipt } from "./parseGenericReceipt";

export const genericParser: ReceiptParser = {
  id: "generic-v1",
  family: "generic",
  priority: 0,

  score(ctx: ParseContext): number {
    return ctx.classification.family === "generic"
      ? ctx.classification.confidence
      : 0.1;
  },

  parse(ctx: ParseContext) {
    return parseGenericReceipt(ctx);
  },
};
