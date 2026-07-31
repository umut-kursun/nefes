import { describe, expect, it } from "vitest";
import {
  getTobaccoAnalysis,
  isTobaccoQuery,
} from "@/lib/analytics";
import type { Expense } from "@/lib/types";

function expense(partial: Partial<Expense>): Expense {
  return {
    id: Math.random().toString(36).slice(2),
    sourceType: "manual",
    date: "2026-07-01",
    time: null,
    merchantName: null,
    merchantRaw: null,
    category: "sigara",
    subcategory: null,
    tagIds: [],
    totalAmount: 0,
    currency: "TRY",
    notes: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    rawText: null,
    confidence: null,
    imageDataUrl: null,
    aiResponseJson: null,
    fuel: null,
    packCount: null,
    quickButtonId: null,
    items: [],
    charges: [],
    discounts: [],
    payments: [],
    unknownLines: [],
    ...partial,
  } as Expense;
}

describe("isTobaccoQuery", () => {
  it("recognizes tobacco keywords and brands (accent-insensitive)", () => {
    expect(isTobaccoQuery("Sigara")).toBe(true);
    expect(isTobaccoQuery("tütün")).toBe(true);
    expect(isTobaccoQuery("Marlboro")).toBe(true);
    expect(isTobaccoQuery("TEKEL")).toBe(true);
  });

  it("ignores non-tobacco queries", () => {
    expect(isTobaccoQuery("süt")).toBe(false);
    expect(isTobaccoQuery("kahve")).toBe(false);
    expect(isTobaccoQuery("s")).toBe(false);
  });
});

describe("getTobaccoAnalysis", () => {
  it("aggregates packs, average price per pack and merchant split", () => {
    const expenses = [
      expense({
        merchantName: "Migros",
        totalAmount: 460,
        packCount: 4,
      }),
      expense({
        merchantName: "Migros",
        totalAmount: 230,
        packCount: 2,
      }),
      expense({
        merchantName: "Tekel Bayi",
        totalAmount: 120,
        packCount: 1,
      }),
      // Non-cigarette rows must be ignored.
      expense({ category: "market", totalAmount: 999, packCount: 9 }),
    ];

    const analysis = getTobaccoAnalysis(expenses);

    expect(analysis.purchaseCount).toBe(3);
    expect(analysis.totalPacks).toBe(7);
    expect(analysis.totalSpend).toBe(810);
    expect(analysis.averagePricePerPack).toBeCloseTo(810 / 7, 5);

    expect(analysis.merchants).toHaveLength(2);
    // Sorted by spend desc: Migros (690) before Tekel Bayi (120).
    expect(analysis.merchants[0]).toMatchObject({
      name: "Migros",
      packs: 6,
      spend: 690,
      purchaseCount: 2,
    });
    expect(analysis.merchants[1]).toMatchObject({
      name: "Tekel Bayi",
      packs: 1,
      spend: 120,
    });
  });

  it("defaults to one pack per purchase when packCount is absent", () => {
    const analysis = getTobaccoAnalysis([
      expense({ merchantName: "Şok", totalAmount: 90 }),
    ]);
    expect(analysis.totalPacks).toBe(1);
    expect(analysis.averagePricePerPack).toBe(90);
  });
});
