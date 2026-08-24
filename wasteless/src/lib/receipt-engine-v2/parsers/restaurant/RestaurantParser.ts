import type { ParseContext, ParseResult, ReceiptParser } from "../../core/types";
import { parseGenericReceipt } from "../generic/parseGenericReceipt";

function isMetadataOrAddress(line: string): boolean {
  return (
    /^(TAR[İI]H|SAAT|F[İI][ŞS]\s*NO|MERS[İI]S|#\d)/i.test(line) ||
    /(?:MAH\.|CAD\.|\bCD\b|\bSK\b|SOK\.|NO:\s*\d|VD\.|V\.D\.)/i.test(line) ||
    /^\d{2}[./-]\d{2}[./-]\d{4}/.test(line)
  );
}

function resolveRestaurantMerchant(ctx: ParseContext): string | null {
  for (const line of ctx.vision.lines.slice(0, 8)) {
    const trimmed = line.trim();
    if (!trimmed || isMetadataOrAddress(trimmed)) continue;
    if (/^(A\.[ŞS]\.|LTD\.?\s*[ŞS]T[İI])/i.test(trimmed)) continue;
    if (trimmed.length >= 3) return trimmed;
  }
  return ctx.vision.merchant?.rawName ?? null;
}

export const restaurantParser: ReceiptParser = {
  id: "restaurant-v1",
  family: "restaurant",
  priority: 8,

  score(ctx: ParseContext): number {
    if (ctx.classification.family === "restaurant") {
      return Math.max(ctx.classification.confidence, 0.6);
    }

    const haystack = [
      ctx.vision.merchant?.rawName ?? "",
      ...ctx.vision.lines.slice(0, 4),
    ].join("\n");

    if (/PROF[İI]TEROL|RESTORAN|CAFE|CAFÉ|KAFE|PASTANE|B[İI]STRO/i.test(haystack)) {
      return 0.65;
    }

    return 0;
  },

  parse(ctx: ParseContext): ParseResult {
    const result = parseGenericReceipt(ctx);
    return {
      ...result,
      merchantOverride: resolveRestaurantMerchant(ctx),
    };
  },
};
