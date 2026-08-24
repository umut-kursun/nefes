import { describe, expect, it } from "vitest";
import { classifyPurchaseCategory } from "@/lib/receipt-engine-v2/classification/categoryClassifier";
import { validateCategoryAuthority } from "@/lib/receipt-engine/layer-7-validate/validation/structural/categoryAuthorityValidator";
import { validateDateTime } from "@/lib/receipt-engine/layer-7-validate/validation/structural/dateTimeValidator";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import { extractReceiptMetadataFromLines } from "../extractReceiptMetadata";
import { resolveMerchantFromLines } from "../resolveMerchant";

describe("resolveMerchantFromLines", () => {
  it("prefers branded header over legal entity (receipt D)", () => {
    const lines = [
      "ÇALGIN TURİZM TİCARET LTD. ŞTİ",
      "TİKİ BEACH BODRUM ŞUBESİ",
      "BODRUM/MUĞLA",
    ];
    expect(resolveMerchantFromLines(lines)).toMatch(/tiki/i);
  });

  it("preserves 5M Migros branding (receipt B)", () => {
    const lines = ["5M MIGROS", "Migros Ticaret A.Ş."];
    expect(resolveMerchantFromLines(lines)).toMatch(/5m/i);
  });

  it("resolves File Market from corrupted OCR header (receipt C)", () => {
    const lines = ["E-FATURA", "FILE VARNALI SİLVİR", "FILE MARKET MAĞAZACILIK"];
    expect(resolveMerchantFromLines(lines)).toMatch(/file market/i);
  });

  it("resolves standalone MIGROS header (receipt A)", () => {
    const lines = ["MIGROS", "MIGROS TİCARET A.Ş.", "TARİH:16/08/2026"];
    expect(resolveMerchantFromLines(lines)).toMatch(/migros/i);
  });
});

describe("extractReceiptMetadataFromLines", () => {
  it("parses labeled TARİH/SAAT (receipt A)", () => {
    const meta = extractReceiptMetadataFromLines([
      "MIGROS",
      "TARİH:16/08/2026",
      "SAAT:19:33",
    ]);
    expect(meta.purchaseDate?.normalized).toBe("2026-08-16");
    expect(meta.purchaseTime?.normalized).toBe("19:33");
  });

  it("parses date-only and bare time lines (receipt F/I shapes)", () => {
    const meta = extractReceiptMetadataFromLines([
      "PETROL OFİSİ",
      "08-08-2026",
      "12:19",
    ]);
    expect(meta.purchaseDate?.normalized).toBe("2026-08-08");
    expect(meta.purchaseTime?.normalized).toBe("12:19");
  });

  it("parses dot-separated date and Saat label (receipt H)", () => {
    const meta = extractReceiptMetadataFromLines([
      "ŞENGÜL HEDİYELİK",
      "12.08.2026",
      "Saat: 00:05",
    ]);
    expect(meta.purchaseDate?.normalized).toBe("2026-08-12");
    expect(meta.purchaseTime?.normalized).toBe("00:05");
  });
});

describe("validateDateTime", () => {
  it("rejects impossible dates", () => {
    const purchase = {
      purchaseDate: Object.freeze({ raw: "13/38/2026", normalized: "2026-38-13" }),
    } as PurchaseDraft;
    const result = validateDateTime(purchase);
    expect(result.issues.some((i) => i.code === "INVALID_RECEIPT_DATE")).toBe(true);
  });

  it("accepts normalized ISO dates", () => {
    const purchase = {
      purchaseDate: Object.freeze({ raw: "16/08/2026", normalized: "2026-08-16" }),
      purchaseTime: Object.freeze({ raw: "19:33", normalized: "19:33" }),
    } as PurchaseDraft;
    const result = validateDateTime(purchase);
    expect(result.issues).toHaveLength(0);
  });
});

describe("category authority", () => {
  it("never silently defaults to market on weak signal", () => {
    const purchase = {
      merchant: "Unknown Shop",
      products: [],
      provenance: { rawTexts: ["UNKNOWN SHOP"] },
    } as PurchaseDraft;
    const classification = classifyPurchaseCategory(purchase, "UNKNOWN SHOP", false);
    expect(classification.categoryId).toBe("diger");
    expect(classification.confidence).toBe("low");
    expect(classification.reason).not.toBe("default_market_fallback");
  });

  it("flags low-confidence category for review", () => {
    const purchase = {
      merchant: "Unknown Shop",
      products: [],
      provenance: { rawTexts: ["UNKNOWN SHOP"] },
    } as PurchaseDraft;
    const result = validateCategoryAuthority(purchase);
    expect(result.issues.some((i) => i.code === "CATEGORY_UNCERTAIN")).toBe(true);
  });

  it("assigns market with high confidence for Migros receipts", () => {
    const purchase = {
      merchant: "Migros",
      products: [{ name: "Coca-Cola" }],
      provenance: { rawTexts: ["MIGROS", "COCA-COLA"] },
    } as PurchaseDraft;
    const classification = classifyPurchaseCategory(purchase, "MIGROS", false);
    expect(classification.categoryId).toBe("market");
    expect(classification.confidence).toBe("high");
  });

  it("assigns hediyelik category id for contract taxonomy (receipt H)", () => {
    const purchase = {
      merchant: "Şengül Hediyelik",
      products: [{ name: "HEDİYELİK EŞYA" }],
      provenance: { rawTexts: ["ŞENGÜL HEDİYELİK", "HEDİYELİK EŞYA"] },
    } as PurchaseDraft;
    const classification = classifyPurchaseCategory(purchase, "HEDİYELİK", false);
    expect(classification.categoryId).toBe("diger");
    expect(classification.confidence).toBe("high");
  });
});
