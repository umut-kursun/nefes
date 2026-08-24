import { visionOcrToParsedReceipt } from "@/lib/receipt-engine-sdk/vision/visionOcrToParsedReceipt";
import type { ParsedReceipt } from "@/lib/receipt-engine-sdk/types/ParsedReceipt";
import type { FooterData } from "../../footer/FooterData";
import type { ParsedProduct } from "../../parser/ParsedProduct";
import type { ParseContext, ParseResult, ReceiptParser } from "../../core/types";
import { visionResultToOcrExtract } from "./visionResultToOcrExtract";

function parsedReceiptToProducts(receipt: ParsedReceipt): ParsedProduct[] {
  return receipt.products.map((item) => ({
    rawName: item.name,
    quantity: item.quantity ?? 1,
    unit: item.unit ?? "ad",
    unitPrice: item.unitPrice ?? null,
    lineTotal: item.lineTotal ?? null,
    vatRate: item.vatRatePercentage ?? null,
    discounts: [],
  }));
}

function parsedReceiptToFooter(receipt: ParsedReceipt): FooterData {
  return {
    subtotal: null,
    total: receipt.financials.totalAmount > 0 ? receipt.financials.totalAmount : null,
    vatTotal: receipt.financials.vatTotal ?? null,
    payments: receipt.payments.map((payment) => ({
      type:
        payment.type === "CASH"
          ? ("cash" as const)
          : payment.type === "CREDIT_CARD"
            ? ("credit_card" as const)
            : ("unknown" as const),
      amount: payment.amount ?? null,
      rawLabel: payment.type,
    })),
  };
}

export function parseWithSdkFallback(ctx: ParseContext): ParseResult {
  const extract = visionResultToOcrExtract(
    ctx.vision,
    ctx.tokens,
    ctx.classification.family
  );
  const receipt = visionOcrToParsedReceipt(extract);
  const products = parsedReceiptToProducts(receipt);
  const footer = parsedReceiptToFooter(receipt);

  return {
    products,
    charges: [],
    blocks: products.map((product) => ({
      productLine: product.rawName,
      quantityLine: null,
      discountLines: [],
    })),
    footer,
    merchantOverride: receipt.merchant.title || null,
  };
}

export const sdkFallbackParser: ReceiptParser = {
  id: "sdk-fallback-v1",
  family: "generic",
  priority: 1,

  score(ctx: ParseContext): number {
    if (ctx.classification.confidence < 0.25) return 0.55;
    return 0;
  },

  parse(ctx: ParseContext) {
    return parseWithSdkFallback(ctx);
  },
};
