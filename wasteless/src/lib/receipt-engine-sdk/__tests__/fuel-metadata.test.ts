import { describe, expect, it } from "vitest";
import { parsedReceiptToPurchaseDraft } from "../adapters/parsedReceiptToPurchaseDraft";
import { extractFuelMetadata } from "../adapters/extractFuelMetadata";
import type { ParsedReceipt } from "../types/ParsedReceipt";
import { purchaseDraftToExpenseDraft } from "@/lib/expense-factory";

const fuelReceipt: ParsedReceipt = {
  merchant: {
    title: "Shell Petrol",
    category: "FUEL",
  },
  metadata: {
    purchaseDate: "2026-07-30",
    purchaseTime: "14:22:00",
    currency: "TRY",
  },
  products: [
    {
      name: "MOTORİN",
      quantity: 35.87,
      unit: "LT",
      unitPrice: 77.21,
      lineTotal: 2767.98,
      vatRatePercentage: 20,
    },
  ],
  payments: [
    {
      type: "CREDIT_CARD",
      amount: 2767.98,
    },
  ],
  financials: {
    totalAmount: 2767.98,
  },
  fuelDetails: {
    plateNumber: "34 ABC 123",
    liters: 35.87,
    pricePerLiter: 77.21,
  },
  rawText: "PLAKA: 34 ABC 123\nMOTORİN 35,870 LT x 77,21",
  confidence: 0.9,
};

describe("extractFuelMetadata", () => {
  it("maps vision fuelDetails and product line to fuel metadata", () => {
    const fuel = extractFuelMetadata(fuelReceipt);
    expect(fuel).not.toBeNull();
    expect(fuel?.fuelType).toBe("Motorin");
    expect(fuel?.liters).toBeCloseTo(35.87, 2);
    expect(fuel?.pricePerLiter).toBeCloseTo(77.21, 2);
    expect(fuel?.plateNumber).toBe("34 ABC 123");
    expect(fuel?.stationName).toMatch(/Shell/i);
  });

  it("derives pricePerLiter from lineTotal / quantity when missing", () => {
    const parsed: ParsedReceipt = {
      ...fuelReceipt,
      fuelDetails: { plateNumber: "06 XYZ 456", liters: 10, pricePerLiter: null },
      products: [
        {
          name: "BENZİN",
          quantity: 10,
          unit: "LT",
          lineTotal: 500,
        },
      ],
    };
    const fuel = extractFuelMetadata(parsed);
    expect(fuel?.fuelType).toBe("Benzin");
    expect(fuel?.pricePerLiter).toBe(50);
  });
});

describe("parsedReceiptToPurchaseDraft fuel", () => {
  it("attaches fuel metadata to PurchaseDraft", async () => {
    const draft = await parsedReceiptToPurchaseDraft(fuelReceipt);
    expect(draft.fuel?.plateNumber).toBe("34 ABC 123");
    expect(draft.fuel?.pricePerLiter).toBeCloseTo(77.21, 2);
  });

  it("maps fuel into expense draft for review UI", () => {
    const expense = purchaseDraftToExpenseDraft(
      {
        merchant: "Shell Petrol",
        purchaseDate: { raw: "2026-07-30", normalized: "2026-07-30" },
        purchaseTime: null,
        receiptNumber: null,
        currency: { raw: "TRY", normalized: "TRY" },
        products: [
          {
            name: "Motorin",
            quantity: 35.87,
            unit: "LT",
            unitPrice: 77.21,
            lineTotal: 2767.98,
            confidence: 0.9,
            provenance: {
              productBlockId: "vision:product:0",
              graphNodeIds: [],
              layoutLineIndices: [],
              rawTexts: ["MOTORİN"],
              ocrTexts: ["MOTORİN"],
              classificationRules: ["vision:okc"],
              confidence: 0.9,
            },
          },
        ],
        charges: [],
        discounts: [],
        payments: [],
        vatSummary: [],
        subtotal: null,
        total: { label: "TOPLAM", amount: 2767.98, confidence: 0.9, provenance: {
          footerBlockId: "footer:vision",
          graphNodeIds: [],
          semanticKind: "total",
          confidence: 0.9,
        } },
        confidence: 0.9,
        fuel: {
          fuelType: "Motorin",
          liters: 35.87,
          pricePerLiter: 77.21,
          plateNumber: "34 ABC 123",
          stationName: "Shell Petrol",
        },
        provenance: {
          metadataBlockId: "metadata:vision",
          footerBlockId: "footer:vision",
          blockDocumentConfidence: 0.9,
          rawTexts: ["PLAKA: 34 ABC 123"],
        },
      },
      {
        ocrRawText: "PLAKA: 34 ABC 123\nMOTORİN",
        categories: [
          {
            id: "akaryakit",
            label: "Akaryakıt",
            description: "",
            icon: "fuel",
            color: "#000",
            softColor: "#eee",
            specialType: "fuel",
            parentId: null,
            sortOrder: 0,
            createdAt: "",
            updatedAt: "",
          },
        ],
      }
    );

    expect(expense.fuel?.plate).toBe("34 ABC 123");
    expect(expense.fuel?.fuelType).toBe("Motorin");
    expect(expense.fuel?.liters).toBeCloseTo(35.87, 2);
    expect(expense.fuel?.pricePerLiter).toBeCloseTo(77.21, 2);
    expect(expense.fuel?.plate).not.toBe("34 ABC 123".replace(/ /g, ""));
  });
});
