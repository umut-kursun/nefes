import { describe, expect, it } from "vitest";
import { purchaseDraftToExpenseDraft } from "@/lib/expense-factory";
import { emptyPurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { UserCategory } from "@/lib/types";

function testCategories(): UserCategory[] {
  return [
    {
      id: "market",
      label: "Market",
      specialType: null,
      createdAt: "",
      updatedAt: "",
    } as UserCategory,
    {
      id: "sigara",
      label: "Sigara",
      specialType: "cigarette",
      createdAt: "",
      updatedAt: "",
    } as UserCategory,
    {
      id: "akaryakit",
      label: "Akaryakıt",
      specialType: "fuel",
      createdAt: "",
      updatedAt: "",
    } as UserCategory,
  ];
}

function samplePurchase(): PurchaseDraft {
  return {
    ...emptyPurchaseDraft(),
    merchant: "MIGROS",
    purchaseDate: { raw: "24.07.2026", normalized: "2026-07-24" },
    purchaseTime: { raw: "14:30", normalized: "14:30" },
    currency: { raw: "TL", normalized: "TRY" },
    total: {
      label: "TOPLAM",
      amount: 61.4,
      confidence: 0.9,
      provenance: {
        footerBlockId: "footer:1",
        graphNodeIds: [],
        semanticKind: "total",
        confidence: 0.9,
      },
    },
    products: [
      {
        name: "Sut 1L",
        quantity: 1,
        unit: "adet",
        unitPrice: 45.9,
        lineTotal: 45.9,
        confidence: 0.85,
        provenance: {
          productBlockId: "p:1",
          graphNodeIds: ["n1"],
          layoutLineIndices: [2],
          rawTexts: ["Sut 1 L %1 45,90"],
          ocrTexts: ["Sut 1 L %1 45,90"],
          classificationRules: ["product"],
          confidence: 0.85,
        },
      },
      {
        name: "Ekmek",
        quantity: 1,
        lineTotal: 15.0,
        confidence: 0.8,
        provenance: {
          productBlockId: "p:2",
          graphNodeIds: ["n2"],
          layoutLineIndices: [3],
          rawTexts: ["Ekmek %1 15,00"],
          ocrTexts: ["Ekmek %1 15,00"],
          classificationRules: ["product"],
          confidence: 0.8,
        },
      },
    ],
    provenance: {
      metadataBlockId: "meta:1",
      footerBlockId: "footer:1",
      blockDocumentConfidence: 0.9,
      rawTexts: [
        "MIGROS A.S.",
        "Sut 1 L %1 45,90",
        "Ekmek %1 15,00",
        "TOPLAM 61,40",
      ],
    },
    confidence: 0.88,
  };
}

describe("purchaseDraftToExpenseDraft", () => {
  it("preserves OCR raw text on the expense and line items", () => {
    const expense = purchaseDraftToExpenseDraft(samplePurchase(), {
      imageDataUrl: "data:image/jpeg;base64,abc",
      ocrRawText: "FULL OCR\nLINE 2",
    });

    expect(expense.sourceType).toBe("receipt");
    expect(expense.rawText).toBe("FULL OCR\nLINE 2");
    expect(expense.merchantName).toBeTruthy();
    expect(expense.totalAmount).toBe(61.4);
    expect(expense.date).toBe("2026-07-24");
    expect(expense.time).toBe("14:30");
    expect(expense.imageDataUrl).toBe("data:image/jpeg;base64,abc");
    expect(expense.items).toHaveLength(2);
    expect(expense.items[0]?.rawText).toContain("Sut");
    expect(expense.items[1]?.rawText).toContain("Ekmek");
    expect(expense.aiResponseJson).toContain("MIGROS");
  });

  it("stores explicit parserJson when provided", () => {
    const expense = purchaseDraftToExpenseDraft(samplePurchase(), {
      parserJson: '{"ok":true}',
    });
    expect(expense.aiResponseJson).toBe('{"ok":true}');
  });

  it("falls back to purchase provenance rawTexts when ocrRawText omitted", () => {
    const expense = purchaseDraftToExpenseDraft(samplePurchase());
    expect(expense.rawText).toContain("MIGROS");
    expect(expense.rawText).toContain("TOPLAM");
  });

  it("maps fuel purchase to akaryakit category with plate and litres", () => {
    const purchase: PurchaseDraft = {
      ...emptyPurchaseDraft(),
      merchant: "SHELL & TURCAS PETROL A.S.",
      purchaseDate: { raw: "29.07.2026", normalized: "2026-07-29" },
      total: {
        label: "TOPLAM",
        amount: 2356.1,
        confidence: 0.9,
        provenance: {
          footerBlockId: "f:1",
          graphNodeIds: [],
          semanticKind: "total",
          confidence: 0.9,
        },
      },
      products: [
        {
          name: "Motorin",
          quantity: 29.766,
          unit: "LT",
          unitPrice: 79.17,
          lineTotal: 2356.1,
          confidence: 0.85,
          provenance: {
            productBlockId: "p:1",
            graphNodeIds: [],
            layoutLineIndices: [3],
            rawTexts: ["Motorin 29,766 LT 79,17 TL/L"],
            ocrTexts: ["Motorin 29,766 LT 79,17 TL/L"],
            classificationRules: ["fuel"],
            confidence: 0.85,
          },
        },
      ],
      provenance: {
        metadataBlockId: "m:1",
        footerBlockId: "f:1",
        blockDocumentConfidence: 0.9,
        rawTexts: ["SHELL", "34 ABC 123", "Motorin 29,766 LT"],
      },
      confidence: 0.88,
    };

    const expense = purchaseDraftToExpenseDraft(purchase, {
      ocrRawText: "SHELL\n34 ABC 123\nMotorin 29,766 LT",
      categories: [
        {
          id: "akaryakit",
          label: "Akaryakıt",
          specialType: "fuel",
          createdAt: "",
          updatedAt: "",
        } as import("@/lib/types").UserCategory,
      ],
    });

    expect(expense.category).toBe("akaryakit");
    expect(expense.fuel?.fuelType).toMatch(/Motorin/i);
    expect(expense.fuel?.liters).toBeCloseTo(29.766, 2);
    expect(expense.fuel?.plate).toBe("34 ABC 123");
    expect(expense.fuel?.stationName).toMatch(/SHELL/i);
  });

  it("does not add TOPKDV/KDV vatSummary as expense charges", () => {
    const purchase: PurchaseDraft = {
      ...emptyPurchaseDraft(),
      total: {
        label: "TOPLAM",
        amount: 100,
        confidence: 0.9,
        provenance: {
          footerBlockId: "f:1",
          graphNodeIds: [],
          semanticKind: "total",
          confidence: 0.9,
        },
      },
      products: [
        {
          name: "Ekmek",
          lineTotal: 100,
          confidence: 0.8,
          provenance: {
            productBlockId: "p:1",
            graphNodeIds: [],
            layoutLineIndices: [0],
            rawTexts: ["Ekmek"],
            ocrTexts: ["Ekmek"],
            classificationRules: [],
            confidence: 0.8,
          },
        },
      ],
      vatSummary: [
        {
          label: "KDV",
          amount: 18,
          confidence: 0.85,
          provenance: {
            footerBlockId: "f:1",
            graphNodeIds: [],
            semanticKind: "vat",
            confidence: 0.85,
          },
        },
      ],
      provenance: {
        metadataBlockId: "m:1",
        footerBlockId: "f:1",
        blockDocumentConfidence: 0.9,
        rawTexts: [],
      },
      confidence: 0.9,
    };

    const expense = purchaseDraftToExpenseDraft(purchase);
    expect(expense.charges.some((c) => /kdv/i.test(c.label))).toBe(false);
    expect(expense.charges).toHaveLength(0);
  });

  it("categorizes Migros receipt with MARLBORO as sigara with correct packCount", () => {
    const purchase: PurchaseDraft = {
      ...emptyPurchaseDraft(),
      merchant: "MIGROS",
      purchaseDate: { raw: "01.08.2026", normalized: "2026-08-01" },
      total: {
        label: "TOPLAM",
        amount: 180,
        confidence: 0.9,
        provenance: {
          footerBlockId: "f:1",
          graphNodeIds: [],
          semanticKind: "total",
          confidence: 0.9,
        },
      },
      products: [
        {
          name: "MARLBORO RED",
          quantity: 2,
          unit: "adet",
          unitPrice: 90,
          lineTotal: 180,
          confidence: 0.85,
          provenance: {
            productBlockId: "p:1",
            graphNodeIds: [],
            layoutLineIndices: [2],
            rawTexts: ["MARLBORO RED 2 AD 90,00"],
            ocrTexts: ["MARLBORO RED 2 AD 90,00"],
            classificationRules: ["product"],
            confidence: 0.85,
          },
        },
      ],
      provenance: {
        metadataBlockId: "m:1",
        footerBlockId: "f:1",
        blockDocumentConfidence: 0.9,
        rawTexts: ["MIGROS A.S.", "MARLBORO RED 2 AD 90,00", "TOPLAM 180,00"],
      },
      confidence: 0.88,
    };

    const expense = purchaseDraftToExpenseDraft(purchase, {
      categories: testCategories(),
    });

    expect(expense.category).toBe("sigara");
    expect(expense.packCount).toBe(2);
    expect(expense.items[0]?.categoryGuess).toBe("sigara");
  });

  it("categorizes mixed grocery + tobacco receipt as sigara when any tobacco product exists", () => {
    const purchase: PurchaseDraft = {
      ...emptyPurchaseDraft(),
      merchant: "MIGROS",
      total: {
        label: "TOPLAM",
        amount: 135.9,
        confidence: 0.9,
        provenance: {
          footerBlockId: "f:1",
          graphNodeIds: [],
          semanticKind: "total",
          confidence: 0.9,
        },
      },
      products: [
        {
          name: "Sut 1L",
          quantity: 1,
          lineTotal: 45.9,
          confidence: 0.85,
          provenance: {
            productBlockId: "p:1",
            graphNodeIds: [],
            layoutLineIndices: [2],
            rawTexts: ["Sut 1 L %1 45,90"],
            ocrTexts: ["Sut 1 L %1 45,90"],
            classificationRules: ["product"],
            confidence: 0.85,
          },
        },
        {
          name: "MARLBORO",
          quantity: 1,
          lineTotal: 90,
          confidence: 0.85,
          provenance: {
            productBlockId: "p:2",
            graphNodeIds: [],
            layoutLineIndices: [3],
            rawTexts: ["MARLBORO 90,00"],
            ocrTexts: ["MARLBORO 90,00"],
            classificationRules: ["product"],
            confidence: 0.85,
          },
        },
      ],
      provenance: {
        metadataBlockId: "m:1",
        footerBlockId: "f:1",
        blockDocumentConfidence: 0.9,
        rawTexts: ["MIGROS A.S.", "Sut 1 L", "MARLBORO 90,00"],
      },
      confidence: 0.88,
    };

    const expense = purchaseDraftToExpenseDraft(purchase, {
      categories: testCategories(),
    });

    expect(expense.category).toBe("sigara");
    expect(expense.packCount).toBe(1);
    const marlboroItem = expense.items.find((i) => /marlboro/i.test(i.name));
    const sutItem = expense.items.find((i) => /sut/i.test(i.name));
    expect(marlboroItem?.categoryGuess).toBe("sigara");
    expect(sutItem?.categoryGuess).toBe("sigara");
  });

  it("categorizes Tekel-only receipt as sigara", () => {
    const purchase: PurchaseDraft = {
      ...emptyPurchaseDraft(),
      merchant: "TEKEL BAYİİ",
      total: {
        label: "TOPLAM",
        amount: 90,
        confidence: 0.9,
        provenance: {
          footerBlockId: "f:1",
          graphNodeIds: [],
          semanticKind: "total",
          confidence: 0.9,
        },
      },
      products: [
        {
          name: "Sigara",
          quantity: 1,
          lineTotal: 90,
          confidence: 0.85,
          provenance: {
            productBlockId: "p:1",
            graphNodeIds: [],
            layoutLineIndices: [1],
            rawTexts: ["Sigara 90,00"],
            ocrTexts: ["Sigara 90,00"],
            classificationRules: ["product"],
            confidence: 0.85,
          },
        },
      ],
      provenance: {
        metadataBlockId: "m:1",
        footerBlockId: "f:1",
        blockDocumentConfidence: 0.9,
        rawTexts: ["TEKEL BAYİİ", "Sigara 90,00", "TOPLAM 90,00"],
      },
      confidence: 0.88,
    };

    const expense = purchaseDraftToExpenseDraft(purchase, {
      categories: testCategories(),
    });

    expect(expense.category).toBe("sigara");
    expect(expense.packCount).toBe(1);
    expect(expense.items[0]?.categoryGuess).toBe("sigara");
  });
});
