import { describe, expect, it } from "vitest";
import type { Expense } from "@/lib/types";
import { getMostPurchasedProduct } from "@/lib/insights/most-purchased-product";
import {
  buildPurchaseIndex,
  getCategoryProductStatsFromIndex,
  productFrequency,
  rebuildIndexProducesSameStats,
  searchPurchaseMemory,
} from "@/lib/analytics/purchase-index";
import { searchPurchaseMemory as searchMemory } from "@/lib/analytics";

function expense(
  partial: Partial<Expense> & Pick<Expense, "id" | "date">
): Expense {
  return {
    sourceType: "manual",
    time: null,
    merchantName: "Test",
    merchantRaw: null,
    category: "market",
    subcategory: null,
    tagIds: [],
    totalAmount: 100,
    currency: "TRY",
    notes: null,
    imageDataUrl: null,
    rawText: null,
    aiResponseJson: null,
    parseStatus: "approved",
    items: [{ name: "Ürün", quantity: 1, unitPrice: 100, totalPrice: 100 }],
    createdAt: partial.date,
    updatedAt: partial.date,
    ...partial,
  } as Expense;
}

function line(
  expenseId: string,
  name: string,
  totalPrice: number,
  extra: Partial<Expense["items"][number]> = {}
): Expense["items"][number] {
  return {
    id: `${expenseId}-${name}`,
    expenseId,
    name,
    normalizedName: name.toLocaleLowerCase("tr-TR"),
    quantity: 1,
    unit: null,
    unitPrice: totalPrice,
    totalPrice,
    categoryGuess: null,
    rawText: null,
    confidence: null,
    ...extra,
  };
}

describe("purchase index analytics", () => {
  it("counts Burcu Napoliten once per receipt despite duplicate lines", () => {
    const productName = "Burcu Napoliten Sos";
    const expenses = ["r1", "r2", "r3"].map((id, i) =>
      expense({
        id,
        date: `2026-07-0${i + 1}`,
        merchantName: "Migros",
        items: Array.from({ length: 5 }, (_, j) =>
          line(id, productName, 30 + j, { productKey: "burcu-napoliten-sos" })
        ),
      })
    );

    const index = buildPurchaseIndex(expenses);
    expect(index.records.filter((r) => r.productName === productName)).toHaveLength(3);
    expect(productFrequency(index, "burcu-napoliten-sos")).toBe(3);

    const stats = getCategoryProductStatsFromIndex(index);
    const row = stats.find((s) => s.name === productName);
    expect(row?.count).toBe(3);
  });

  it("aligns assistant and memory counts for cigarette purchases", () => {
    const expenses = Array.from({ length: 18 }, (_, i) =>
      expense({
        id: `cig-${i}`,
        date: `2026-06-${String(i + 1).padStart(2, "0")}`,
        category: "sigara",
        merchantName: i % 2 === 0 ? "Migros" : "Tekel Bayii",
        totalAmount: 240,
        packCount: 1,
        items: [
          line(`cig-${i}`, "Marlboro Edge", 240, {
            categoryGuess: "sigara",
          }),
        ],
      })
    );

    const memory = searchPurchaseMemory(expenses, "sigara");
    expect(memory).not.toBeNull();
    expect(memory!.purchaseCount).toBe(18);
    expect(memory!.hits).toHaveLength(18);

    const insight = getMostPurchasedProduct({
      expenses,
      categories: [],
      tags: [],
      now: new Date("2026-07-01"),
    });
    expect(insight).not.toBeNull();
    const match = insight!.description.match(/(\d+) kez/);
    expect(Number(match![1])).toBeLessThanOrEqual(18);
  });

  it("searching sigara returns tobacco purchases not Migros groceries", () => {
    const expenses = [
      expense({
        id: "grocery",
        date: "2026-07-01",
        merchantName: "Migros",
        items: [
          line("grocery", "Süt", 30),
          line("grocery", "Ekmek", 15),
          line("grocery", "Peynir", 80),
        ],
      }),
      expense({
        id: "cig",
        date: "2026-07-02",
        merchantName: "Migros",
        category: "sigara",
        items: [line("cig", "Marlboro Edge", 240, { categoryGuess: "sigara" })],
      }),
      expense({
        id: "cig2",
        date: "2026-07-03",
        merchantName: "Tekel Bayii",
        items: [line("cig2", "Parliament Night Blue", 250)],
      }),
    ];

    const result = searchMemory(expenses, "sigara");
    expect(result).not.toBeNull();
    expect(result!.hits.every((h) => /marlboro|parliament|sigara/i.test(h.itemName))).toBe(
      true
    );
    expect(result!.hits.some((h) => /süt|ekmek|peynir/i.test(h.itemName))).toBe(false);
    expect(result!.purchaseCount).toBe(2);
  });

  it("searching Migros returns merchant history not unrelated products", () => {
    const expenses = [
      expense({
        id: "1",
        date: "2026-07-01",
        merchantName: "Migros",
        items: [line("1", "Süt", 30)],
      }),
      expense({
        id: "2",
        date: "2026-07-02",
        merchantName: "Migros",
        items: [line("2", "Ekmek", 15)],
      }),
      expense({
        id: "3",
        date: "2026-07-03",
        merchantName: "BIM",
        items: [line("3", "Süt", 28)],
      }),
    ];

    const result = searchMemory(expenses, "Migros");
    expect(result).not.toBeNull();
    expect(result!.purchaseCount).toBe(2);
    expect(result!.hits.every((h) => h.store === "Migros")).toBe(true);
  });

  it("merchant matches do not outrank product matches for ambiguous queries", () => {
    const expenses = [
      expense({
        id: "1",
        date: "2026-07-01",
        merchantName: "Migros",
        items: [line("1", "Marlboro Edge", 240, { categoryGuess: "sigara" })],
      }),
      ...Array.from({ length: 10 }, (_, i) =>
        expense({
          id: `visit-${i}`,
          date: `2026-06-${String(i + 1).padStart(2, "0")}`,
          merchantName: "Migros",
          items: [line(`visit-${i}`, "Süt", 30)],
        })
      ),
    ];

    const result = searchMemory(expenses, "marlboro");
    expect(result).not.toBeNull();
    expect(result!.purchaseCount).toBe(1);
    expect(result!.hits[0]?.itemName).toMatch(/marlboro/i);
  });

  it("duplicate indexing never increases counts when rebuilding", () => {
    const expenses = [
      expense({
        id: "1",
        date: "2026-07-01",
        merchantName: "Migros",
        items: [
          line("1", "Burcu Napoliten Sos", 30, { productKey: "burcu-napoliten-sos" }),
          line("1", "Burcu Napoliten Sos", 30, { productKey: "burcu-napoliten-sos" }),
        ],
      }),
    ];

    expect(rebuildIndexProducesSameStats(expenses)).toBe(true);
    const index = buildPurchaseIndex(expenses);
    expect(productFrequency(index, "burcu-napoliten-sos")).toBe(1);
  });

  it("dedupes product purchases to one row per receipt", () => {
    const expenses = [
      expense({
        id: "1",
        date: "2026-07-01",
        merchantName: "Migros",
        items: [
          line("1", "Süt", 30),
          line("1", "Süt", 32),
        ],
      }),
      expense({
        id: "2",
        date: "2026-07-05",
        merchantName: "BIM",
        items: [line("2", "Süt", 28)],
      }),
    ];

    const result = searchMemory(expenses, "Süt");
    expect(result?.purchaseCount).toBe(2);
  });

  it("returns null price trend for a single purchase", () => {
    const expenses = [
      expense({
        id: "1",
        date: "2026-07-01",
        merchantName: "Migros",
        items: [line("1", "Süt", 30, { unit: "ad" })],
      }),
    ];

    const result = searchMemory(expenses, "Süt");
    expect(result?.priceChangePct).toBeNull();
    expect(result?.previousComparablePrice).toBeNull();
    expect(result?.latestComparablePrice).toBeNull();
  });

  it("skips price trend when units are not comparable", () => {
    const expenses = [
      expense({
        id: "1",
        date: "2026-07-05",
        merchantName: "Migros",
        items: [
          line("1", "Süt", 120, {
            quantity: 1,
            unit: "LT",
            unitPrice: 120,
          }),
        ],
      }),
      expense({
        id: "2",
        date: "2026-07-01",
        merchantName: "Migros",
        items: [line("2", "Süt", 30, { quantity: 1, unit: "ad" })],
      }),
    ];

    const result = searchMemory(expenses, "Süt");
    expect(result?.priceChangePct).toBeNull();
  });

  it("hides absurd price trend percentages", () => {
    const expenses = [
      expense({
        id: "1",
        date: "2026-07-05",
        merchantName: "Migros",
        items: [line("1", "Süt", 500, { quantity: 1, unit: "ad" })],
      }),
      expense({
        id: "2",
        date: "2026-07-01",
        merchantName: "Migros",
        items: [line("2", "Süt", 10, { quantity: 1, unit: "ad" })],
      }),
    ];

    const result = searchMemory(expenses, "Süt");
    expect(result?.priceChangePct).toBeNull();
  });

  it("computes price trend for comparable unit purchases", () => {
    const expenses = [
      expense({
        id: "1",
        date: "2026-07-05",
        merchantName: "Migros",
        items: [line("1", "Süt", 33, { quantity: 1, unit: "ad" })],
      }),
      expense({
        id: "2",
        date: "2026-07-01",
        merchantName: "Migros",
        items: [line("2", "Süt", 30, { quantity: 1, unit: "ad" })],
      }),
    ];

    const result = searchMemory(expenses, "Süt");
    expect(result?.priceChangePct).toBe(10);
    expect(result?.latestComparablePrice).toBe(33);
    expect(result?.previousComparablePrice).toBe(30);
  });
});
