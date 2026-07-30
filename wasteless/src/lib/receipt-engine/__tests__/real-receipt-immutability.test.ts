import { describe, expect, it } from "vitest";
import {
  REAL_RECEIPT_CATALOG,
  REAL_RECEIPT_OCR_CHECKSUMS,
  sha256File,
  realReceiptOcrPath,
  verifyRealReceiptOcrImmutable,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";

describe("Real Receipt OCR immutability guard", () => {
  for (const ref of REAL_RECEIPT_CATALOG) {
    it(`${ref.merchant}/${ref.name} — OCR .txt checksum matches manifest`, () => {
      const txtPath = realReceiptOcrPath(ref);
      const actual = sha256File(txtPath);
      const expected = REAL_RECEIPT_OCR_CHECKSUMS[ref.merchant];
      expect(actual).toBe(expected);
      expect(verifyRealReceiptOcrImmutable(ref)).toBe(true);
    });
  }

  it("manifest covers every catalog entry", () => {
    for (const ref of REAL_RECEIPT_CATALOG) {
      expect(REAL_RECEIPT_OCR_CHECKSUMS[ref.merchant]).toBeTruthy();
    }
  });
});
