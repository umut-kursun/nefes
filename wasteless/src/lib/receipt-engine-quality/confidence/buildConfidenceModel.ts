import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import { clampConfidence } from "@/lib/receipt-engine/types/provenance";
import type {
  QualityPipelineOutputs,
  ReceiptConfidenceBreakdown,
} from "../types";

const FUEL_PATTERN =
  /\b(motorin|benzin|dizel|lpg|fuel|akaryakit|akaryakıt)\b/i;

function averageConfidence(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return clampConfidence(
    values.reduce((sum, v) => sum + v, 0) / values.length
  );
}

function merchantConfidence(purchase: PurchaseDraft): number {
  if (!purchase.merchant) return 0;
  return clampConfidence(purchase.confidence * 0.9);
}

function fuelProducts(purchase: PurchaseDraft) {
  return purchase.products.filter(
    (p) => p.unit === "LT" || FUEL_PATTERN.test(p.name)
  );
}

/** Aggregate confidence breakdown from existing pipeline confidence fields. */
export function buildConfidenceModel(
  outputs: QualityPipelineOutputs
): ReceiptConfidenceBreakdown {
  const { layout, classified, blocks, purchase, validation } = outputs;

  const productConfidences = purchase.products.map((p) => p.confidence);
  const paymentConfidences = purchase.payments.map((p) => p.confidence);
  const vatConfidences = purchase.vatSummary.map((p) => p.confidence);
  const totalConfidences = [
    purchase.subtotal?.confidence,
    purchase.total?.confidence,
  ].filter((c): c is number => c != null);
  const fuelConfidences = fuelProducts(purchase).map((p) => p.confidence);
  const metadataConfidences = [
    purchase.purchaseDate ? purchase.confidence : undefined,
    purchase.purchaseTime ? purchase.confidence : undefined,
    purchase.receiptNumber ? purchase.confidence : undefined,
    purchase.currency ? purchase.confidence : undefined,
  ].filter((c): c is number => c != null);

  const merchant = merchantConfidence(purchase);
  const products = averageConfidence(productConfidences);
  const payments = averageConfidence(paymentConfidences);
  const vat = averageConfidence(vatConfidences);
  const totals = averageConfidence(totalConfidences);
  const fuel = averageConfidence(fuelConfidences);
  const metadata = averageConfidence(metadataConfidences);

  const overallInputs = [
    merchant,
    products,
    payments,
    vat,
    totals,
    purchase.confidence,
    layout.confidence,
  ].filter((c) => c > 0);

  return {
    merchant,
    products,
    payments,
    vat,
    totals,
    fuel,
    metadata,
    layout: layout.confidence,
    classification: classified.confidence,
    blocks: blocks.confidence,
    purchase: purchase.confidence,
    validation: clampConfidence(validation.score / 100),
    overall: averageConfidence(overallInputs),
  };
}
