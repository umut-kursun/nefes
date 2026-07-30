import {
  scoreMerchantCandidates,
} from "@/lib/receipt-engine/layer-5-blocks/merchantScorer";
import type { LayoutDocument } from "@/lib/receipt-engine/types/models/layout";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import { clampConfidence } from "@/lib/receipt-engine/types/provenance";
import type {
  FieldExplanation,
  QualityPipelineOutputs,
  ReceiptFieldExplanations,
} from "../types";

const FUEL_PATTERN =
  /\b(motorin|benzin|dizel|lpg|fuel|akaryakit|akaryakıt)\b/i;

function layoutLinesForIndices(
  layout: LayoutDocument,
  indices: readonly number[]
): readonly { index: number; text: string }[] {
  const byIndex = new Map(layout.lines.map((l) => [l.index, l.text]));
  return indices.map((index) => ({
    index,
    text: byIndex.get(index) ?? "",
  }));
}

function explainMerchant(
  purchase: PurchaseDraft,
  layout: LayoutDocument
): FieldExplanation | null {
  if (!purchase.merchant) return null;

  const headerLines = layout.lines.filter((l) => l.region === "header");
  const candidates = scoreMerchantCandidates(headerLines);
  const match = candidates.find((c) => c.text === purchase.merchant);
  const best = match ?? candidates[0];

  const sourceIndices = best ? [best.lineIndex] : headerLines.slice(0, 1).map((l) => l.index);
  const reason = best
    ? `Selected by merchantScorer (score=${best.score}; reasons: ${best.reasons.join(", ") || "default"})`
    : "Merchant assigned from metadata block without scorer match";

  return {
    field: "merchant",
    value: purchase.merchant,
    confidence: clampConfidence(best?.score ? Math.min(1, best.score / 100) : 0.65),
    reason,
    sourceLines: layoutLinesForIndices(layout, sourceIndices),
    sourceRules: best ? Object.freeze([...best.reasons]) : undefined,
  };
}

function explainProduct(
  layout: LayoutDocument,
  product: PurchaseDraft["products"][number],
  index: number
): FieldExplanation {
  const section =
    product.provenance.layoutLineIndices.length > 0
      ? layout.lines.find(
          (l) => l.index === product.provenance.layoutLineIndices[0]
        )?.sectionKind
      : undefined;

  const inProducts = section === "products" || section === "header";
  const isFuel =
    product.unit === "LT" ||
    FUEL_PATTERN.test(product.name) ||
    product.provenance.classificationRules.some((r) => r.includes("fuel"));

  const reason = isFuel
    ? "Detected as fuel product line (litres + fuel token)"
    : inProducts
      ? "Detected inside PRODUCTS section"
      : "Promoted to product from classified graph";

  return {
    field: `products[${index}]`,
    value: product.name,
    confidence: product.confidence,
    reason,
    sourceLines: layoutLinesForIndices(
      layout,
      product.provenance.layoutLineIndices
    ),
    sourceRules: product.provenance.classificationRules,
  };
}

function explainFooterLine(
  field: string,
  index: number,
  line: PurchaseDraft["payments"][number],
  defaultReason: string
): FieldExplanation {
  return {
    field: `${field}[${index}]`,
    value: line.label,
    confidence: line.confidence,
    reason: `${defaultReason} (semanticKind=${line.provenance.semanticKind})`,
    sourceLines: [],
    sourceRules: [line.provenance.semanticKind],
  };
}

function explainMetadata(
  purchase: PurchaseDraft,
  layout: LayoutDocument
): readonly FieldExplanation[] {
  const explanations: FieldExplanation[] = [];
  const metaFields: Array<{
    key: "purchaseDate" | "purchaseTime" | "receiptNumber" | "currency";
    label: string;
  }> = [
    { key: "purchaseDate", label: "purchaseDate" },
    { key: "purchaseTime", label: "purchaseTime" },
    { key: "receiptNumber", label: "receiptNumber" },
    { key: "currency", label: "currency" },
  ];

  for (const { key, label } of metaFields) {
    const field = purchase[key];
    if (!field) continue;
    const headerMatch = layout.lines.find(
      (l) =>
        l.lineSemanticType === "DateLine" ||
        l.lineSemanticType === "TimeLine" ||
        l.lineSemanticType === "ReceiptNumberLine"
    );
    explanations.push({
      field: label,
      value: field.normalized ?? field.raw,
      confidence: purchase.confidence,
      reason: "Extracted from metadata block header fields",
      sourceLines: headerMatch
        ? [{ index: headerMatch.index, text: headerMatch.text }]
        : [],
    });
  }

  return Object.freeze(explanations);
}

/** Post-hoc field explanations from existing provenance — no parser changes. */
export function buildFieldExplanations(
  outputs: Pick<
    QualityPipelineOutputs,
    "layout" | "blocks" | "purchase"
  >
): ReceiptFieldExplanations {
  const { layout, purchase } = outputs;

  const products = purchase.products.map((p, i) => explainProduct(layout, p, i));

  const fuel = purchase.products
    .filter((p) => p.unit === "LT" || FUEL_PATTERN.test(p.name))
    .map((p, i) => explainProduct(layout, p, i));

  const payments = purchase.payments.map((p, i) =>
    explainFooterLine("payments", i, p, "Detected as payment line")
  );

  const vat = purchase.vatSummary.map((p, i) =>
    explainFooterLine("vat", i, p, "Detected as VAT summary line")
  );

  const totals: FieldExplanation[] = [];
  if (purchase.subtotal) {
    totals.push({
      field: "subtotal",
      value: purchase.subtotal.label,
      confidence: purchase.subtotal.confidence,
      reason: "Detected as subtotal line in totals section",
      sourceLines: [],
      sourceRules: [purchase.subtotal.provenance.semanticKind],
    });
  }
  if (purchase.total) {
    totals.push({
      field: "total",
      value: purchase.total.label,
      confidence: purchase.total.confidence,
      reason: "Detected as total line in totals section",
      sourceLines: [],
      sourceRules: [purchase.total.provenance.semanticKind],
    });
  }

  return {
    merchant: explainMerchant(purchase, layout),
    products,
    payments,
    vat,
    totals,
    fuel,
    metadata: explainMetadata(purchase, layout),
  };
}

/** Convenience overload with blocks for API symmetry. */
export function buildFieldExplanationsFromPipeline(
  outputs: QualityPipelineOutputs
): ReceiptFieldExplanations {
  return buildFieldExplanations(outputs);
}
