import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  finalizeVisionParsedReceipt,
  parseParsedReceiptJson,
} from "../types/ParsedReceipt";
import { coerceRawVisionOutput } from "../vision/coerceRawVisionOutput";
import { extractReceiptNumberFromRawText } from "../vision/extractReceiptNumberFromRawText";

const shellRawText = readFileSync(
  join(
    process.cwd(),
    "src/lib/receipt-engine/fixtures/ocr/shell-alanduzu.txt"
  ),
  "utf8"
);

describe("extractReceiptNumberFromRawText", () => {
  it("extracts FİŞ NO from Shell Alandüzü OCR fixture", () => {
    expect(extractReceiptNumberFromRawText(shellRawText)).toBe("0010");
  });

  it("prefers FİŞ NO over Z NO when both appear", () => {
    const raw = "Z NO: 0424\nFİŞ NO: 0013\nTOPLAM *100,00";
    expect(extractReceiptNumberFromRawText(raw)).toBe("0013");
  });

  it("fills metadata.receiptNumber during coerce when Vision omitted it", () => {
    const coerced = coerceRawVisionOutput({
      merchant: { title: "SHELL", category: "FUEL" },
      metadata: { purchaseDate: "2026-07-27" },
      products: [{ name: "MOTORİN", lineTotal: 2356.1 }],
      financials: { totalAmount: 2356.1 },
      rawText: shellRawText,
    }) as { metadata: { receiptNumber: string | null } };

    expect(coerced.metadata.receiptNumber).toBe("0010");
  });

  it("fills metadata.receiptNumber in normalizeVisionReceipt pipeline", () => {
    const finalized = finalizeVisionParsedReceipt(
      parseParsedReceiptJson({
        merchant: { title: "SHELL PETROL A.Ş", category: "FUEL" },
        metadata: { purchaseDate: "2026-07-27", currency: "TRY" },
        products: [
          {
            name: "MOTORİN SVİD",
            quantity: 29.766,
            unit: "LT",
            unitPrice: 79.17,
            lineTotal: 2356.1,
          },
        ],
        payments: [{ type: "CREDIT_CARD", amount: 2356.1 }],
        financials: { totalAmount: 2356.1 },
        rawText: shellRawText,
      })
    );

    expect(finalized.metadata.receiptNumber).toBe("0010");
  });
});
