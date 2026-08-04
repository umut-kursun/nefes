import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { getPeriodTotals } from "@/lib/analytics";
import {
  formatSamePeriodMonthCaption,
  formatSamePeriodMonthInsight,
  getSamePeriodMonthBounds,
  isMonthTrendReady,
  MONTH_TREND_MIN_DAY,
} from "@/lib/analytics/month-comparison";
import { getSamePeriodMonthInsight } from "@/lib/insights/same-period-month";
import type { Expense } from "@/lib/types";

function expense(
  partial: Partial<Expense> & Pick<Expense, "id" | "date" | "totalAmount">
): Expense {
  return {
    sourceType: "manual",
    time: null,
    merchantName: "Test",
    merchantRaw: null,
    category: "market",
    subcategory: null,
    tagIds: [],
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

describe("month-comparison bounds", () => {
  it("aligns Aug 1–3 with Jul 1–3 when today is Aug 3", () => {
    const now = new Date("2026-08-03T12:00:00");
    const bounds = getSamePeriodMonthBounds(now);
    expect(bounds.dayCount).toBe(3);
    expect(format(bounds.currentStart, "yyyy-MM-dd")).toBe("2026-08-01");
    expect(format(bounds.previousStart, "yyyy-MM-dd")).toBe("2026-07-01");
    expect(format(bounds.previousEnd, "yyyy-MM-dd")).toBe("2026-07-03");
  });

  it("blocks trend alerts before day 6", () => {
    expect(isMonthTrendReady(new Date("2026-08-03"))).toBe(false);
    expect(isMonthTrendReady(new Date("2026-08-05"))).toBe(false);
    expect(isMonthTrendReady(new Date("2026-08-06"))).toBe(true);
    expect(MONTH_TREND_MIN_DAY).toBe(6);
  });
});

describe("getPeriodTotals same-period monthly trend", () => {
  const expenses = [
    expense({ id: "1", date: "2026-08-01", totalAmount: 500 }),
    expense({ id: "2", date: "2026-08-02", totalAmount: 300 }),
    expense({ id: "3", date: "2026-07-01", totalAmount: 200 }),
    expense({ id: "4", date: "2026-07-02", totalAmount: 200 }),
    expense({ id: "5", date: "2026-07-20", totalAmount: 900 }),
  ];

  it("returns null monthly trend on Aug 3 (early month guard)", () => {
    const totals = getPeriodTotals(expenses, new Date("2026-08-03"));
    expect(totals.monthly).toBe(800);
    expect(totals.trends.monthly).toBeNull();
    expect(totals.samePeriodMonth.previous).toBe(400);
    expect(totals.samePeriodMonth.trendReady).toBe(false);
  });

  it("compares Aug 1–6 vs Jul 1–6 on Aug 6 (not full July)", () => {
    const totals = getPeriodTotals(expenses, new Date("2026-08-06"));
    expect(totals.samePeriodMonth.previous).toBe(400);
    expect(totals.trends.monthly).not.toBeNull();
    expect(totals.trends.monthly).toBeGreaterThan(0);
  });
});

describe("same-period month insight", () => {
  it("generates insight with proportional copy from day 6", () => {
    const now = new Date("2026-08-06");
    const expenses = [
      expense({ id: "1", date: "2026-08-01", totalAmount: 600 }),
      expense({ id: "2", date: "2026-08-03", totalAmount: 200 }),
      expense({ id: "3", date: "2026-07-01", totalAmount: 200 }),
      expense({ id: "4", date: "2026-07-04", totalAmount: 100 }),
    ];
    const insight = getSamePeriodMonthInsight({
      expenses,
      categories: [],
      tags: [],
      now,
    });
    expect(insight).not.toBeNull();
    expect(insight!.description).toMatch(/ilk 6 gün/);
    expect(insight!.description).toMatch(/aynı dönem/);
  });

  it("returns null insight before day 6", () => {
    const insight = getSamePeriodMonthInsight({
      expenses: [expense({ id: "1", date: "2026-08-01", totalAmount: 100 })],
      categories: [],
      tags: [],
      now: new Date("2026-08-02"),
    });
    expect(insight).toBeNull();
  });
});

describe("formatSamePeriodMonthInsight", () => {
  it("uses day-count in copy", () => {
    expect(formatSamePeriodMonthInsight(25, 3)).toMatch(/ilk 3 gün/);
    expect(formatSamePeriodMonthCaption(new Date("2026-08-08"))).toMatch(
      /ilk 8 gün/
    );
  });
});
