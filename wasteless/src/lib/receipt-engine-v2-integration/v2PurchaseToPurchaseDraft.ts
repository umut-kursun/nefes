import { cleanMerchantName } from "@/lib/receipt-engine-sdk/normalize/cleanMerchantName";
import { normalizeMerchantName } from "@/lib/merchants";
import {
  extractReceiptMetadataFromLines,
  mergeMetadataFields,
} from "@/lib/receipt-engine-v2/normalization/extractReceiptMetadata";
import { resolveMerchantFromLines } from "@/lib/receipt-engine-v2/normalization/resolveMerchant";
import type {
  PurchaseDraft,
  PurchaseLine,
} from "@/lib/receipt-engine/types/models/purchase";
import type { Purchase } from "@/lib/receipt-engine-v2/engine/types";
import type { ReceiptDocument } from "@/lib/receipt-engine-v2/extraction/types";
import type { VisionResult } from "@/lib/receipt-engine-v2/vision/types";

function footerProv(
  kind: string,
  doc: ReceiptDocument | undefined,
  fieldProv: { confidence: number; sourceLineIndices: readonly number[]; method: string } | null,
  blockId = "footer:semantic"
) {
  return Object.freeze({
    footerBlockId: blockId,
    graphNodeIds: Object.freeze([] as string[]),
    semanticKind: kind as "payment" | "total" | "vat" | "subtotal" | "discount" | "charge",
    confidence: fieldProv?.confidence ?? 0.6,
    ...(fieldProv
      ? {
          layoutLineIndices: fieldProv.sourceLineIndices,
          extractionMethod: fieldProv.method,
        }
      : {}),
    ...(doc ? { rawLineCount: doc.rawLines.length } : {}),
  });
}

function resolveMetadataFields(
  purchase: Purchase,
  vision: VisionResult
): {
  purchaseDate: PurchaseDraft["purchaseDate"];
  purchaseTime: PurchaseDraft["purchaseTime"];
  receiptNumber: PurchaseDraft["receiptNumber"];
  currency: PurchaseDraft["currency"];
} {
  const fromLines = extractReceiptMetadataFromLines(vision.lines);
  const merged = mergeMetadataFields(fromLines, {
    purchaseDate: purchase.metadata.purchaseDate ?? vision.metadata?.purchaseDate ?? null,
    purchaseTime: purchase.metadata.purchaseTime ?? vision.metadata?.purchaseTime ?? null,
    receiptNumber: purchase.metadata.receiptNumber ?? vision.metadata?.receiptNumber ?? null,
    currency: purchase.metadata.currency ?? vision.metadata?.currency ?? "TRY",
  });

  return {
    purchaseDate: merged.purchaseDate,
    purchaseTime: merged.purchaseTime,
    receiptNumber: merged.receiptNumber,
    currency: merged.currency,
  };
}

function productLine(
  product: Purchase["products"][number],
  index: number,
  doc: ReceiptDocument | undefined
): PurchaseLine {
  const withProv = doc?.products[index];
  const confidence = withProv?.provenance.confidence ?? 0.65;
  const sourceLines = withProv?.provenance.sourceLineIndices ?? [index];
  const rawTexts =
    sourceLines.map((i) => doc?.rawLines[i] ?? product.rawName).filter(Boolean) as string[];

  return Object.freeze({
    name: product.rawName.trim(),
    quantity: product.quantity,
    unit: product.unit || undefined,
    unitPrice: product.unitPrice ?? undefined,
    lineTotal: product.lineTotal ?? undefined,
    ...(product.vatRate != null ? { vatRate: product.vatRate } : {}),
    confidence,
    provenance: Object.freeze({
      productBlockId: `semantic:product:${index}`,
      graphNodeIds: Object.freeze([]),
      layoutLineIndices: Object.freeze([...sourceLines]),
      rawTexts: Object.freeze(rawTexts.length > 0 ? rawTexts : [product.rawName]),
      ocrTexts: Object.freeze(rawTexts.length > 0 ? rawTexts : [product.rawName]),
      classificationRules: Object.freeze([
        withProv?.provenance.method ?? "receipt-engine-v2:semantic-product",
      ]),
      confidence,
    }),
  });
}

function resolveMerchantTitle(
  purchase: Purchase,
  vision: VisionResult
): string | null {
  const fromLines = resolveMerchantFromLines(vision.lines, {
    rawVisionName: purchase.merchant.rawName,
  });
  if (fromLines) return fromLines;

  const raw = purchase.merchant.rawName?.trim();
  if (!raw) return null;
  const cleaned = cleanMerchantName(raw);
  return normalizeMerchantName(cleaned) || cleaned || raw;
}

function normalizeFuelType(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const upper = raw.toUpperCase();
  if (/MOTOR/.test(upper)) return "Motorin";
  if (/BENZ/.test(upper)) return "Benzin";
  if (/DIZEL|DİZEL|DIESEL/.test(upper)) return "Dizel";
  if (/LPG/.test(upper)) return "LPG";
  return raw.trim();
}

/** Convert Receipt Engine V2 purchase output into the legacy PurchaseDraft UI model. */
export function v2PurchaseToPurchaseDraft(
  purchase: Purchase,
  vision: VisionResult,
  receiptDocument?: ReceiptDocument
): PurchaseDraft {
  const merchant = resolveMerchantTitle(purchase, vision);
  const confidence = vision.confidence ?? 0.55;
  const metadataFields = resolveMetadataFields(purchase, vision);

  const products = Object.freeze(
    purchase.products.map((product, index) =>
      productLine(product, index, receiptDocument)
    )
  );

  const discounts = Object.freeze(
    (receiptDocument?.discounts ?? []).map((discount, index) => {
      const conf = 0.75;
      return Object.freeze({
        label: discount.rawText.trim() || `İndirim ${index + 1}`,
        amount: discount.amount,
        confidence: conf,
        provenance: footerProv("discount", receiptDocument, {
          confidence: conf,
          sourceLineIndices: [],
          method: "semantic:discount",
        }),
      });
    })
  );

  const payments = Object.freeze(
    purchase.footer.payments.map((payment, index) => {
      const conf = payment.amount != null ? 0.82 : 0.55;
      return Object.freeze({
        label: payment.rawLabel.trim() || payment.type,
        amount: payment.amount ?? undefined,
        confidence: conf,
        provenance: footerProv("payment", receiptDocument, {
          confidence: conf,
          sourceLineIndices: [],
          method: `semantic:payment:${index}`,
        }),
      });
    })
  );

  const vatSummary =
    purchase.footer.vatTotal != null
      ? Object.freeze([
          Object.freeze({
            label: "TOPKDV",
            amount: purchase.footer.vatTotal,
            confidence: receiptDocument?.vatProvenance?.confidence ?? 0.8,
            provenance: footerProv(
              "vat",
              receiptDocument,
              receiptDocument?.vatProvenance ?? null
            ),
          }),
        ])
      : Object.freeze([]);

  const subtotal =
    purchase.footer.subtotal != null
      ? Object.freeze({
          label: "ARA TOPLAM",
          amount: purchase.footer.subtotal,
          confidence: receiptDocument?.subtotalProvenance?.confidence ?? 0.8,
          provenance: footerProv(
            "subtotal",
            receiptDocument,
            receiptDocument?.subtotalProvenance ?? null
          ),
        })
      : null;

  const total =
    purchase.footer.total != null
      ? Object.freeze({
          label: "TOPLAM",
          amount: purchase.footer.total,
          confidence: receiptDocument?.totalProvenance?.confidence ?? 0.85,
          provenance: footerProv(
            "total",
            receiptDocument,
            receiptDocument?.totalProvenance ?? null
          ),
        })
      : null;

  const charges = Object.freeze(
    purchase.charges.map((charge, index) =>
      Object.freeze({
        label: charge.rawName.trim() || "Ücret",
        amount: charge.amount,
        confidence: 0.78,
        provenance: footerProv("charge", receiptDocument, {
          confidence: 0.78,
          sourceLineIndices: [],
          method: `semantic:charge:${index}`,
        }),
        ...(charge.vatRate != null ? { vatRate: charge.vatRate } : {}),
      })
    )
  );

  const fuelMeta =
    purchase.fuel != null
      ? Object.freeze({
          fuelType: normalizeFuelType(purchase.fuel.fuelType),
          liters: purchase.fuel.quantity,
          pricePerLiter: purchase.fuel.unitPrice,
          plateNumber: purchase.fuel.plateNumber,
          stationName: merchant,
        })
      : null;

  return Object.freeze({
    merchant,
    purchaseDate: metadataFields.purchaseDate,
    purchaseTime: metadataFields.purchaseTime,
    receiptNumber: metadataFields.receiptNumber,
    currency: metadataFields.currency,
    products,
    charges,
    discounts,
    payments,
    vatSummary,
    subtotal,
    total,
    confidence,
    fuel: fuelMeta,
    provenance: Object.freeze({
      metadataBlockId: "metadata:v2",
      footerBlockId: "footer:semantic",
      blockDocumentConfidence: confidence,
      rawTexts: Object.freeze([...vision.lines]),
    }),
  });
}
