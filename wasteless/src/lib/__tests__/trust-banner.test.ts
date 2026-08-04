import { describe, expect, it } from "vitest";
import {
  resolveTrustLevel,
  shouldShowOcrTrustBanner,
} from "@/lib/ocr-trust";
import { createManualExpense } from "@/lib/expense-factory";

describe("trust banner OCR eligibility", () => {
  it("does not show trust banner for manual entries", () => {
    const expense = createManualExpense();
    expect(expense.confidence).toBeNull();
    expect(shouldShowOcrTrustBanner(expense.sourceType, expense.confidence)).toBe(
      false
    );
  });

  it("does not show trust banner for quick-button entries", () => {
    expect(shouldShowOcrTrustBanner("quick_button", null)).toBe(false);
    expect(shouldShowOcrTrustBanner("quick_button", 1)).toBe(false);
  });

  it("shows trust banner only for receipt scans with confidence", () => {
    expect(shouldShowOcrTrustBanner("receipt", 0.92)).toBe(true);
    expect(shouldShowOcrTrustBanner("receipt", null)).toBe(false);
  });

  it("resolveTrustLevel returns null for missing confidence", () => {
    expect(resolveTrustLevel(null)).toBeNull();
    expect(resolveTrustLevel(undefined)).toBeNull();
  });

  it("resolveTrustLevel never defaults null to high", () => {
    expect(resolveTrustLevel(null)).not.toBe("high");
  });

  it("resolveTrustLevel maps OCR scores correctly", () => {
    expect(resolveTrustLevel(0.9)).toBe("high");
    expect(resolveTrustLevel(0.75)).toBe("medium");
    expect(resolveTrustLevel(0.5)).toBe("low");
  });
});
