import { LineKind } from "../../tokenizer/LineKind";
import type { FooterData } from "../../footer/FooterData";
import type { ParsedProduct } from "../../parser/ParsedProduct";
import type { ParseContext, ParseResult, ReceiptParser } from "../../core/types";import { parseTurkishAmount } from "../../core/parseTurkishAmount";
import { parseGenericReceipt } from "../generic/parseGenericReceipt";

const FUEL_QTY_LINE =
  /^\s*(\d+(?:[.,]\d+)?)\s*(?:LT|L)\s+[Xx]\s+(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:[.,]\d+)?)/i;

const FUEL_PRODUCT =
  /(?:BENZ[İI]N|MOTOR[İI]N|D[İI]ZEL|LPG|EURO\s*D[İI]ESEL)/i;

const VAT_LINE = /^\s*[×x]\s*(\d+)\s+\*([\d.,]+)\s*$/i;

function parseFuelFooter(ctx: ParseContext, lineTotal: number | null): FooterData {
  let total: number | null = lineTotal;
  let vatTotal: number | null = null;
  const payments: FooterData["payments"][number][] = [];
  for (const token of ctx.tokens) {
    if (token.kind === LineKind.PaymentAmount) {
      const amount = parseTurkishAmount(token.raw);
      if (amount == null) continue;
      if (total == null || amount > total) {
        if (total != null && amount < total) vatTotal = amount;
        total = amount;
      } else if (vatTotal == null || amount < total) {
        vatTotal = amount;
      }
      payments.push({ type: "unknown", amount, rawLabel: token.raw });
    }
    if (token.kind === LineKind.GrandTotal && /TOPLAM/i.test(token.raw)) {
      const inline = parseTurkishAmount(token.raw);
      if (inline != null) total = inline;
    }
  }

  const cardLabel = ctx.tokens.find((t) => /K\.?\s*KARTI|KRED[İI]/i.test(t.raw));
  if (cardLabel && payments.length > 0) {
    const last = payments[payments.length - 1]!;
    payments[payments.length - 1] = { ...last, type: "credit_card", rawLabel: cardLabel.raw };
  }

  return { subtotal: null, total, vatTotal, payments };
}

function parseFuelReceipt(ctx: ParseContext): ParseResult {
  const tokens = ctx.tokens;
  let qtyLine: string | null = null;
  let productName: string | null = null;
  let lineTotal: number | null = null;
  let vatRate: number | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;

    if (token.kind === LineKind.QuantityDetail && FUEL_QTY_LINE.test(token.raw)) {
      qtyLine = token.raw;
      continue;
    }

    if (
      (token.kind === LineKind.Unknown || token.kind === LineKind.ProductCandidate) &&
      FUEL_PRODUCT.test(token.raw) &&
      !VAT_LINE.test(token.raw)
    ) {
      productName = token.raw.trim();
      continue;
    }

    if (VAT_LINE.test(token.raw)) {
      const vatMatch = token.raw.match(VAT_LINE);
      vatRate = vatMatch?.[1] ? Number(vatMatch[1]) : null;
      continue;
    }

    if (token.kind === LineKind.PaymentAmount) {
      const amount = parseTurkishAmount(token.raw);
      if (amount != null && (lineTotal == null || amount > lineTotal)) {
        lineTotal = amount;
      }
    }
  }

  if (qtyLine && productName) {
    const match = qtyLine.match(FUEL_QTY_LINE);
    const quantity = match?.[1] ? parseTurkishAmount(match[1]) : null;
    const unitPrice = match?.[2] ? parseTurkishAmount(match[2]) : null;

    if (quantity != null && unitPrice != null) {
      const product: ParsedProduct = {
        rawName: productName,
        quantity,
        unit: "lt",
        unitPrice,
        lineTotal: lineTotal ?? quantity * unitPrice,
        vatRate,
        discounts: [],
      };

      return {
        products: [product],
        charges: [],
        blocks: [
          {
            productLine: `${productName} ${qtyLine}`,
            quantityLine: null,
            discountLines: [],
          },
        ],
        footer: parseFuelFooter(ctx, product.lineTotal),
        merchantOverride: null,
      };
    }
  }

  return parseGenericReceipt(ctx);
}

export const fuelParser: ReceiptParser = {
  id: "fuel-v1",
  family: "fuel",
  priority: 10,

  score(ctx: ParseContext): number {
    if (ctx.classification.family === "fuel") {
      return Math.max(ctx.classification.confidence, 0.65);
    }

    const haystack = [
      ctx.vision.merchant?.rawName ?? "",
      ...ctx.vision.lines.slice(0, 6),
    ].join("\n");

    if (/AKARYAKIT|PETROL|OPET\b|SHELL\b|MOTOR[İI]N|BENZ[İI]N/i.test(haystack)) {
      return 0.7;
    }

    return 0;
  },

  parse(ctx: ParseContext) {
    return parseFuelReceipt(ctx);
  },
};
