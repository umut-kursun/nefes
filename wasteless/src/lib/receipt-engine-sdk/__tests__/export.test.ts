import { describe, expect, it } from "vitest";
import {
  REAL_RECEIPT_CATALOG,
  loadRealReceiptOcr,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { analyzeReceipt } from "../analyzeReceipt";
import {
  exportCsvFromResult,
  exportMarkdown,
  exportPurchaseFromResult,
  exportQualityReport,
  exportReceiptResult,
} from "../export/index";

describe("export module", () => {
  it("exports receipt result in multiple formats", async () => {
    const ref = REAL_RECEIPT_CATALOG[1];
    const ocr = loadRealReceiptOcr(ref);
    const result = await analyzeReceipt({ ocrText: ocr.rawText });

    const json = exportPurchaseFromResult(result);
    expect(json).toContain('"merchant"');

    const csv = exportCsvFromResult(result);
    expect(csv).toContain("type,name");

    const markdown = exportMarkdown(result);
    expect(markdown).toContain("# Receipt Analysis");

    const quality = exportQualityReport(result);
    expect(quality).toContain('"confidence"');

    const dispatched = await exportReceiptResult(result, "json");
    expect(typeof dispatched).toBe("string");
  });
});
