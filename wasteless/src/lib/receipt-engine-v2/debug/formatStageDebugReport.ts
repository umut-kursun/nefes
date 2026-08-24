import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { ReceiptStageTimings } from "@/lib/receipt-engine-debug/formatStageTimings";
import type { FooterPayment } from "../footer/FooterData";
import type { ParsedProduct } from "../parser/ParsedProduct";
import type { ProductBlock } from "../parser/ProductBlock";
import type { TokenizedLine } from "../tokenizer/TokenizedLine";
import type { ReceiptEngineV2Result } from "../engine/types";

const KIND_COL_WIDTH = 20;

function section(title: string): string {
  return `\n==================== ${title} ====================`;
}

function padIndex(index: number): string {
  return `[${String(index).padStart(2, "0")}]`;
}

function formatNullable(value: string | number | null | undefined): string {
  if (value == null || value === "") return "-";
  return String(value);
}

function formatAmount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

function formatField(label: string, value: string | number | null | undefined): string {
  return `${label}:\n${formatNullable(value)}`;
}

function formatVisionSummary(result: ReceiptEngineV2Result): string {
  const { rawVision } = result;
  return [
    section("VISION"),
    "",
    formatField("merchant", rawVision.merchant?.rawName),
    "",
    formatField("date", rawVision.metadata?.purchaseDate),
    "",
    formatField("time", rawVision.metadata?.purchaseTime),
    "",
    formatField("receiptNumber", rawVision.metadata?.receiptNumber),
    "",
    formatField("currency", rawVision.metadata?.currency),
  ].join("\n");
}

function formatOcrLines(lines: readonly string[]): string {
  const body =
    lines.length > 0
      ? lines.map((line, index) => `${padIndex(index)} ${line}`).join("\n")
      : "(none)";
  return [section("OCR LINES"), "", body].join("\n");
}

function formatTokenizer(
  ocrLines: readonly string[],
  tokens: readonly TokenizedLine[]
): string {
  const body =
    tokens.length > 0
      ? tokens
          .map((token, index) => {
            const ocr = ocrLines[index] ?? "(missing OCR line)";
            const kind = token.kind.padEnd(KIND_COL_WIDTH, " ");
            return [
              padIndex(index),
              `LineKind: ${kind}`,
              `OCR:      ${ocr}`,
              `raw:      ${token.raw}`,
            ].join("\n");
          })
          .join("\n\n")
      : "(none)";

  return [section("TOKENIZER"), "", body].join("\n");
}

function formatDiscountLines(lines: readonly string[]): string {
  if (lines.length === 0) return "(none)";
  return lines.map((line, index) => `${padIndex(index)} ${line}`).join("\n");
}

function formatProductBlock(block: ProductBlock, index: number): string {
  return [
    `BLOCK #${index + 1}`,
    "",
    formatField("productLine", block.productLine),
    "",
    formatField("quantityLine", block.quantityLine),
    "",
    "discountLines:",
    formatDiscountLines(block.discountLines),
  ].join("\n");
}

function formatProductBlocks(blocks: readonly ProductBlock[]): string {
  const body =
    blocks.length > 0
      ? blocks.map(formatProductBlock).join("\n\n----------------------\n\n")
      : "(none)";
  return [section("PRODUCT BLOCKS"), "", body].join("\n");
}

function formatParsedProduct(product: ParsedProduct, index: number): string {
  return [
    `PRODUCT #${index + 1}`,
    "",
    formatField("rawName", product.rawName),
    "",
    formatField("quantity", product.quantity),
    "",
    formatField("unit", product.unit),
    "",
    formatField("unitPrice", formatAmount(product.unitPrice)),
    "",
    formatField("lineTotal", formatAmount(product.lineTotal)),
    "",
    formatField("vatRate", product.vatRate),
    "",
    "discounts:",
    product.discounts.length > 0
      ? product.discounts
          .map(
            (discount, discountIndex) =>
              `${padIndex(discountIndex)} ${discount.rawText} amount=${formatAmount(discount.amount)}`
          )
          .join("\n")
      : "(none)",
  ].join("\n");
}

function formatParsedProducts(products: readonly ParsedProduct[]): string {
  const body =
    products.length > 0
      ? products.map(formatParsedProduct).join("\n\n----------------------\n\n")
      : "(none)";
  return [section("PARSED PRODUCTS"), "", body].join("\n");
}

function formatPaymentLabel(payment: FooterPayment): string {
  switch (payment.type) {
    case "credit_card":
      return "CARD";
    case "cash":
      return "CASH";
    case "meal_card":
      return "MEAL CARD";
    default:
      return payment.rawLabel.trim() || "UNKNOWN";
  }
}

function formatFooter(footer: ReceiptEngineV2Result["footer"]): string {
  const lines = [
    section("FOOTER"),
    "",
    formatField("subtotal", formatAmount(footer.subtotal)),
    "",
    formatField("vat", formatAmount(footer.vatTotal)),
    "",
    formatField("total", formatAmount(footer.total)),
    "",
    "payments:",
  ];

  if (footer.payments.length === 0) {
    lines.push("(none)");
  } else {
    for (const [index, payment] of footer.payments.entries()) {
      lines.push("");
      lines.push(`PAYMENT #${index + 1}`);
      lines.push(formatField("type", formatPaymentLabel(payment)));
      lines.push(formatField("rawLabel", payment.rawLabel));
      lines.push(formatField("amount", formatAmount(payment.amount)));
    }
  }

  return lines.join("\n");
}

function formatFinalPurchase(result: ReceiptEngineV2Result): string {
  const { purchase } = result;
  return [
    section("FINAL PURCHASE"),
    "",
    formatField("merchant", purchase.merchant.rawName),
    "",
    formatField("productCount", purchase.products.length),
    "",
    formatField("total", formatAmount(purchase.footer.total)),
  ].join("\n");
}

export function formatValidationSummary(validation: ValidationReportGolden): string {
  const lines = [
    section("VALIDATION"),
    "",
    formatField("valid", validation.isValid ? "yes" : "no"),
    "",
    formatField("score", validation.score),
    "",
    formatField("consistent", validation.consistent ? "yes" : "no"),
    "",
    formatField("errorCount", validation.errors.length),
    "",
    formatField("warningCount", validation.warnings.length),
    "",
    "errors:",
  ];

  if (validation.errors.length === 0) {
    lines.push("(none)");
  } else {
    for (const [index, error] of validation.errors.entries()) {
      lines.push(`${padIndex(index)} ${error.code}: ${error.message}`);
    }
  }

  lines.push("", "warnings:");

  if (validation.warnings.length === 0) {
    lines.push("(none)");
  } else {
    for (const [index, warning] of validation.warnings.entries()) {
      lines.push(`${padIndex(index)} ${warning.code}: ${warning.message}`);
    }
  }

  return lines.join("\n");
}

function formatClassification(result: ReceiptEngineV2Result): string {
  const { classification, parserId, parsePath } = result;
  return [
    section("CLASSIFICATION"),
    "",
    formatField("layoutFamily", classification.family),
    "",
    formatField("confidence", classification.confidence.toFixed(2)),
    "",
    formatField("parserId", parserId),
    "",
    formatField("parsePath", parsePath),
    "",
    "signals:",
    classification.signals.length > 0
      ? classification.signals.map((signal, index) => `${padIndex(index)} ${signal}`).join("\n")
      : "(none)",
  ].join("\n");
}

function formatPerformanceSummary(timings?: ReceiptStageTimings): string {
  const lines = [section("PERFORMANCE"), ""];

  if (!timings) {
    lines.push("(no timing data)");
    return lines.join("\n");
  }

  if (timings.engine) {
    lines.push(formatField("engine", timings.engine));
    lines.push("");
  }

  const rows: Array<[string, number | undefined]> = [
    ["preprocessMs", timings.preprocessMs],
    ["resizeMs", timings.resizeMs],
    ["base64EncodeMs", timings.base64EncodeMs],
    ["networkMs", timings.networkMs],
    ["ocrMs", timings.ocrMs ?? timings.openAiRequestMs],
    ["jsonParseMs", timings.jsonParseMs],
    ["purchaseDraftMs", timings.purchaseDraftMs ?? timings.purchaseMs],
    ["validationMs", timings.validationMs],
    ["totalMs", timings.clientTotalMs ?? timings.totalMs],
  ];

  let printed = false;
  for (const [label, ms] of rows) {
    if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) continue;
    const sec = ms >= 1000 ? ` (${(ms / 1000).toFixed(1)} s)` : "";
    lines.push(`${label}: ${Math.round(ms)} ms${sec}`);
    printed = true;
  }

  if (!printed) {
    lines.push("(no timing data)");
  }

  return lines.join("\n");
}

export function formatStageDebugReport(options: {
  engineResult: ReceiptEngineV2Result;
  validation: ValidationReportGolden;
  stageTimings?: ReceiptStageTimings;
}): string {
  const { engineResult, validation, stageTimings } = options;
  const ocrLines = engineResult.rawVision.lines;

  return [
    formatVisionSummary(engineResult),
    formatOcrLines(ocrLines),
    formatTokenizer(ocrLines, engineResult.tokens),
    formatClassification(engineResult),
    formatProductBlocks(engineResult.blocks),
    formatParsedProducts(engineResult.products),
    formatFooter(engineResult.footer),
    formatFinalPurchase(engineResult),
    formatValidationSummary(validation),
    formatPerformanceSummary(stageTimings),
  ].join("\n");
}
