import { afterAll, describe, expect, it } from "vitest";
import { loadAllGoldenReceipts } from "./GoldenReceipt";
import { formatGoldenSuiteReport, runGoldenSuite } from "./runGoldenSuite";

const receipts = loadAllGoldenReceipts();

describe("Receipt Engine V2 golden suite", () => {
  it("discovers at least one golden receipt fixture", () => {
    expect(receipts.length).toBeGreaterThan(0);
  });

  it("matches all golden receipts field-by-field", () => {
    const suite = runGoldenSuite(receipts);

    if (!suite.passed) {
      console.error(formatGoldenSuiteReport(suite));
    }

    expect(suite.passed, suite.report).toBe(true);
    expect(suite.failedCount).toBe(0);
  });

  it.each(receipts.map((receipt) => [receipt.meta.slug, receipt] as const))(
    "%s golden regression",
    (_slug, receipt) => {
      const suite = runGoldenSuite([receipt]);
      const result = suite.results[0];

      if (result && !result.passed) {
        console.error(result.report);
      }

      expect(result?.passed, result?.report).toBe(true);
    }
  );
});

afterAll(() => {
  const suite = runGoldenSuite(receipts);
  console.log(formatGoldenSuiteReport(suite));
});
