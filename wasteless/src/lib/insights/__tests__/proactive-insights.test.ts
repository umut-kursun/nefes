import { describe, expect, it } from "vitest";
import type { Expense, UserCategory } from "@/lib/types";
import { getFuelMonthTrend } from "../fuel-month-trend";
import { getCoffeeFrequency } from "../coffee-frequency";
import { getCigaretteSpending } from "../cigarette-spending";

const categories: UserCategory[] = [
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
  {
    id: "sigara",
    label: "Sigara",
    description: "",
    icon: "cigarette",
    color: "#000",
    softColor: "#eee",
    specialType: "cigarette",
    parentId: null,
    sortOrder: 1,
    createdAt: "",
    updatedAt: "",
  },
];

function expense(partial: Partial<Expense> & Pick<Expense, "id" | "date">): Expense {
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
    items: [],
    payments: [],
    unknownLines: [],
    fuel: null,
    packCount: null,
    createdAt: partial.date,
    updatedAt: partial.date,
    ...partial,
  };
}

describe("proactive insights", () => {
  it("fuel month trend detects increase", () => {
    const now = new Date("2026-07-15");
    const expenses = [
      expense({ id: "1", date: "2026-07-10", category: "akaryakit", totalAmount: 2000 }),
      expense({ id: "2", date: "2026-06-10", category: "akaryakit", totalAmount: 1000 }),
    ];
    const insight = getFuelMonthTrend({ expenses, categories, tags: [], now });
    expect(insight).not.toBeNull();
    expect(insight!.description).toMatch(/akaryakıt|yakıt/i);
  });

  it("coffee frequency counts kahve items", () => {
    const now = new Date("2026-07-15");
    const expenses = [
      expense({
        id: "1",
        date: "2026-07-01",
        items: [
          {
            id: "i1",
            expenseId: "1",
            name: "Kahve",
            normalizedName: "kahve",
            quantity: 1,
            unit: null,
            unitPrice: 80,
            totalPrice: 80,
            categoryGuess: null,
            rawText: null,
            confidence: null,
          },
        ],
      }),
      expense({
        id: "2",
        date: "2026-07-05",
        items: [
          {
            id: "i2",
            expenseId: "2",
            name: "Latte",
            normalizedName: "latte",
            quantity: 1,
            unit: null,
            unitPrice: 90,
            totalPrice: 90,
            categoryGuess: null,
            rawText: null,
            confidence: null,
          },
        ],
      }),
    ];
    const insight = getCoffeeFrequency({ expenses, categories, tags: [], now });
    expect(insight).not.toBeNull();
    expect(insight!.description).toMatch(/kahve|Kahve/i);
  });

  it("cigarette spending reports sigara category", () => {
    const now = new Date("2026-07-15");
    const expenses = [
      expense({ id: "1", date: "2026-07-10", category: "sigara", totalAmount: 480, packCount: 2 }),
      expense({ id: "2", date: "2026-07-12", category: "sigara", totalAmount: 240, packCount: 1 }),
    ];
    const insight = getCigaretteSpending({ expenses, categories, tags: [], now });
    expect(insight).not.toBeNull();
  });
});
