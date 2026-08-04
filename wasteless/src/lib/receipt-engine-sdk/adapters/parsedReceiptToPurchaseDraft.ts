import {
  finalizeVisionParsedReceipt,
  type ParsedReceipt,
} from "../types/ParsedReceipt";
import type { PurchaseDraft, PurchaseLine } from "@/lib/receipt-engine/types/models/purchase";
import { applyVknMerchantCache, rememberVknMerchant } from "@/lib/merchant-vkn-cache";
import { normalizeMerchantName } from "@/lib/merchants";
import { cleanMerchantName } from "../normalize/cleanMerchantName";
import { normalizeItemMetrics } from "../normalize/normalizeItemMetrics";
import { inferReceiptItemUnit } from "../vision/parsedReceiptReconcile";
import { extractFuelMetadata } from "./extractFuelMetadata";

const FOOTER_CONF = 0.9;
const PRODUCT_CONF = 0.9;

function footerProv(kind: string, blockId = "footer:vision") {
  return Object.freeze({
    footerBlockId: blockId,
    graphNodeIds: Object.freeze([] as string[]),
    semanticKind: kind as "payment" | "total" | "vat" | "subtotal",
    confidence: FOOTER_CONF,
  });
}

function resolveMerchantTitle(parsed: ParsedReceipt): string {
  const cleaned = cleanMerchantName(parsed.merchant.title);
  return normalizeMerchantName(cleaned) || cleaned || parsed.merchant.title;
}

function productLine(
  item: ParsedReceipt["products"][number],
  index: number
): PurchaseLine {
  const unit = item.unit?.trim()
    ? item.unit.trim().toLowerCase()
    : inferReceiptItemUnit(item);
  const qty = item.quantity;
  const unitPrice =
    item.unitPrice ??
    (qty != null && qty > 0 ? item.lineTotal / qty : undefined);
  const lineTotal = item.lineTotal;

  const metrics = normalizeItemMetrics({
    name: item.name,
    quantity: qty ?? undefined,
    unitPrice: unitPrice ?? lineTotal,
    lineTotal,
    unit,
  });
  const displayName = metrics.cleanedName || item.name.trim();

  return Object.freeze({
    name: displayName,
    quantity: qty ?? null,
    unit,
    unitPrice,
    lineTotal,
    baseUnit: item.baseUnit ?? metrics.baseUnit,
    normalizedUnitPrice: item.normalizedUnitPrice ?? metrics.normalizedUnitPrice,
    variantSize: item.variantSize ?? metrics.variantSize,
    productKey: item.productKey ?? metrics.productKey,
    ...(item.vatRatePercentage != null
      ? { vatRate: item.vatRatePercentage }
      : {}),
    confidence: PRODUCT_CONF,
    provenance: Object.freeze({
      productBlockId: `vision:product:${index}`,
      graphNodeIds: Object.freeze([]),
      layoutLineIndices: Object.freeze([]),
      rawTexts: Object.freeze([item.name]),
      ocrTexts: Object.freeze([item.name]),
      classificationRules: Object.freeze(["vision:okc"]),
      confidence: PRODUCT_CONF,
    }),
  });
}

function paymentLabel(p: ParsedReceipt["payments"][number]): string {
  const parts = [
    p.type === "CREDIT_CARD" ? "KREDİ" : p.type === "CASH" ? "NAKİT" : "ÖDEME",
    p.bankName,
    p.cardLastFour ? `****${p.cardLastFour}` : null,
    p.approvalCode ? `ONAY:${p.approvalCode}` : null,
  ].filter(Boolean);
  return parts.join(" ").trim();
}

/** Idempotent vision finalize before draft mapping. */
export function prepareParsedReceiptForDraft(
  parsed: ParsedReceipt
): ParsedReceipt {
  return finalizeVisionParsedReceipt(parsed);
}

/** Map vision ParsedReceipt → PurchaseDraft (SDK contract). */
export async function parsedReceiptToPurchaseDraft(
  parsed: ParsedReceipt
): Promise<PurchaseDraft> {
  const reconciled = prepareParsedReceiptForDraft(parsed);
  const cached = await applyVknMerchantCache(reconciled);
  const merchantTitle = resolveMerchantTitle(cached);

  void rememberVknMerchant(cached).catch(() => undefined);

  const products = Object.freeze(
    cached.products.map((item, index) => productLine(item, index))
  );

  const platformCharges = cached.platformCharges ?? [];
  const charges = Object.freeze(
    platformCharges.map((c) =>
      Object.freeze({
        label: c.name,
        amount: c.amount,
        confidence: FOOTER_CONF,
        provenance: footerProv("charge"),
      })
    )
  );

  const payments = Object.freeze(
    cached.payments.map((p) =>
      Object.freeze({
        label: paymentLabel(p),
        amount: p.amount,
        confidence: FOOTER_CONF,
        provenance: footerProv("payment"),
      })
    )
  );

  const discounts = Object.freeze(
    (cached.discounts ?? []).map((d) =>
      Object.freeze({
        label: d.linkedProductName
          ? `${d.name} (${d.linkedProductName})`
          : d.name,
        amount: -Math.abs(d.amount),
        confidence: FOOTER_CONF,
        provenance: footerProv("discount"),
      })
    )
  );

  const vatSummary =
    cached.financials.vatTotal != null
      ? Object.freeze([
          Object.freeze({
            label: "TOPKDV",
            amount: cached.financials.vatTotal,
            confidence: FOOTER_CONF,
            provenance: footerProv("vat"),
          }),
        ])
      : Object.freeze([]);

  const total = Object.freeze({
    label: "TOPLAM",
    amount: cached.financials.totalAmount,
    confidence: FOOTER_CONF,
    provenance: footerProv("total"),
  });

  return Object.freeze({
    merchant: merchantTitle,
    purchaseDate: Object.freeze({
      raw: cached.metadata.purchaseDate,
      normalized: cached.metadata.purchaseDate,
    }),
    purchaseTime: cached.metadata.purchaseTime
      ? Object.freeze({
          raw: cached.metadata.purchaseTime,
          normalized: cached.metadata.purchaseTime,
        })
      : null,
    receiptNumber: cached.metadata.receiptNumber
      ? Object.freeze({
          raw: cached.metadata.receiptNumber,
          normalized: cached.metadata.receiptNumber,
        })
      : null,
    currency: Object.freeze({
      raw: cached.metadata.currency,
      normalized: cached.metadata.currency,
    }),
    products,
    charges,
    discounts,
    payments,
    vatSummary,
    subtotal: null,
    total,
    confidence: cached.confidence ?? 0.9,
    fuel: extractFuelMetadata(cached),
    provenance: Object.freeze({
      metadataBlockId: "metadata:vision",
      footerBlockId: "footer:vision",
      blockDocumentConfidence: cached.confidence ?? 0.9,
      rawTexts: Object.freeze(
        cached.rawText ? cached.rawText.split(/\r?\n/).filter(Boolean) : []
      ),
    }),
  });
}
