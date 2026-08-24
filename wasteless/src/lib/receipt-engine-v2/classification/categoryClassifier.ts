import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";

export type CategoryClassification = {
  readonly categoryId: string;
  readonly subcategory: string | null;
  readonly confidence: "high" | "medium" | "low";
  readonly reason: string;
};

const FUEL_TYPE = /(?:MOTOR[İI]N|BENZ[İI]N|D[İI]ZEL|DIESEL|V\s*\/?\s*MAX|LPG|EURO\s*D[İI]ESEL)/i;
const HEDIYELIK = /HED[İI]YEL[İI]K/i;
const RESTAURANT_CAFE =
  /\b(tiki\s*beach|alt[ıi]nk[ıi]l[ıi][çc]|kahve|cafe|kafe|restoran|restaurant|g[ıi]da|burger|beach|profiterol|tatl[ıi]|bistro|çehre)\b/i;
const SUPERMARKET =
  /\b(migros|5m\s*migros|file\s*market|bim\b|a101|carrefour|sok\b|macrocenter)\b/i;

function haystack(purchase: PurchaseDraft, ocrRawText: string | null): string {
  return [
    purchase.merchant ?? "",
    ocrRawText ?? "",
    ...purchase.products.map((p) => p.name),
    ...purchase.provenance.rawTexts,
  ]
    .join("\n")
    .toLocaleLowerCase("tr-TR");
}

function fuelSubcategoryFromText(text: string): string | null {
  const upper = text.toUpperCase();
  if (/MOTOR/.test(upper)) return "Motorin";
  if (/DIZEL|DİZEL|DIESEL|V\s*\/?\s*MAX/.test(upper)) return "Motorin";
  if (/BENZ/.test(upper)) return "Benzin";
  if (/LPG/.test(upper)) return "LPG";
  return null;
}

/** Deterministic category from merchant/product/OCR signals — not generic market fallback. */
export function classifyPurchaseCategory(
  purchase: PurchaseDraft,
  ocrRawText: string | null,
  hasFuel: boolean
): CategoryClassification {
  const text = haystack(purchase, ocrRawText);
  const productBlob = purchase.products.map((p) => p.name).join(" ");

  if (hasFuel || purchase.fuel != null || FUEL_TYPE.test(text)) {
    const sub =
      fuelSubcategoryFromText(
        [purchase.fuel?.fuelType, productBlob, text].filter(Boolean).join(" ")
      ) ?? "Motorin";
    return {
      categoryId: "akaryakit",
      subcategory: sub,
      confidence: "high",
      reason: "fuel_receipt",
    };
  }

  if (HEDIYELIK.test(text) || HEDIYELIK.test(productBlob)) {
    return {
      categoryId: "diger",
      subcategory: "Hediyelik",
      confidence: "high",
      reason: "hediyelik_product",
    };
  }

  if (RESTAURANT_CAFE.test(text)) {
    const sub = /\bkahve|cafe|kafe|espresso|cappuccino|americano\b/i.test(text)
      ? "Kafe"
      : "Restoran";
    return {
      categoryId: "yeme_icme",
      subcategory: sub,
      confidence: "high",
      reason: "restaurant_cafe_merchant",
    };
  }

  if (SUPERMARKET.test(text)) {
    return {
      categoryId: "market",
      subcategory: null,
      confidence: "high",
      reason: "supermarket_merchant",
    };
  }

  if (purchase.products.length > 0 && !SUPERMARKET.test(text)) {
    return {
      categoryId: "diger",
      subcategory: null,
      confidence: "low",
      reason: "weak_domain_signal",
    };
  }

  return {
    categoryId: "diger",
    subcategory: null,
    confidence: "low",
    reason: "insufficient_domain_signal",
  };
}
