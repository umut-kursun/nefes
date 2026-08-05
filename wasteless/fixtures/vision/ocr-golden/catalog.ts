import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { VisionOcrExtract } from "@/lib/receipt-engine-sdk/vision/visionOcrExtract";

export type GoldenOcrProductExpectation = {
  readonly nameMatch: string;
  readonly quantity?: number;
  readonly unitPrice?: number;
  readonly lineTotal?: number;
};

export type GoldenOcrExpectations = {
  readonly totalAmount: number;
  readonly keyProducts: readonly string[];
  readonly forbiddenProductPatterns: readonly RegExp[];
  readonly productChecks?: readonly GoldenOcrProductExpectation[];
  readonly minProductCount?: number;
  readonly maxProductCount?: number;
  readonly bagCount?: number;
  readonly discountCount?: number;
};

export type GoldenOcrFixtureEntry = {
  readonly id: string;
  readonly label: string;
  readonly ocrFile: string;
  readonly imageFile: string;
  readonly expected: GoldenOcrExpectations;
};

const GOLDEN_DIR = join(process.cwd(), "fixtures/vision/ocr-golden");
const RECEIPT_IMAGE_DIR = join(process.cwd(), "fixtures/receipts");

export const GOLDEN_OCR_CATALOG: readonly GoldenOcrFixtureEntry[] = [
  {
    id: "migros-644",
    label: "Migros 644.05 — weighted items, multipliers, Coca-Cola promo discount",
    ocrFile: "migros-644-ocr.json",
    imageFile: "migros-644.png",
    expected: {
      totalAmount: 644.05,
      keyProducts: [
        "SALATA ATOM",
        "HIYAR BADEM",
        "COCA-COLA",
        "MIGROS PLASTIK POSET",
      ],
      forbiddenProductPatterns: [
        /^\d+(?:[.,]\d+)?\s*KG\s+x/i,
        /^\d+\s*AD\s+x/i,
      ],
      discountCount: 1,
      minProductCount: 14,
    },
  },
  {
    id: "migros-2125",
    label: "Migros 2125.57 — CRITICAL regression (ALGIDA *1, MARLBORO, poşet merge)",
    ocrFile: "migros-2125-ocr.json",
    imageFile: "migros-2125.png",
    expected: {
      totalAmount: 2125.57,
      keyProducts: [
        "ALGIDA FRIGOLA",
        "MARLBORO TBLUE",
        "MIGROS PLASTIK POSET",
        "BURCU NAPOLITEN",
      ],
      forbiddenProductPatterns: [
        /^\d+\s*AD\s+x/i,
        /9 AD/i,
        /4 AD/i,
      ],
      productChecks: [
        {
          nameMatch: "ALGIDA FRIGOLA",
          quantity: 1,
          unitPrice: 360,
          lineTotal: 360,
        },
        {
          nameMatch: "MARLBORO TBLUE",
          quantity: 1,
          unitPrice: 460,
          lineTotal: 460,
        },
      ],
      bagCount: 1,
      discountCount: 2,
    },
  },
  {
    id: "mcdonalds-1295",
    label: "McDonald's 1295.00 — combo menu with parenthetical components",
    ocrFile: "mcdonalds-1295-ocr.json",
    imageFile: "mcdonalds-1295.png",
    expected: {
      totalAmount: 1295,
      keyProducts: [
        "McCrispy Deluxe",
        "Big Mac",
        "Citir Tavuk",
        "Ranch Sos",
        "Buyuk Patates",
      ],
      forbiddenProductPatterns: [/^\(/],
      minProductCount: 5,
      maxProductCount: 5,
    },
  },
  {
    id: "birinci-profiterol-625",
    label: "Birinci Profiterol 625.00 — single TATLI line POS receipt",
    ocrFile: "birinci-profiterol-625-ocr.json",
    imageFile: "birinci-profiterol-625.png",
    expected: {
      totalAmount: 625,
      keyProducts: ["TATLI"],
      forbiddenProductPatterns: [],
      minProductCount: 1,
      maxProductCount: 1,
    },
  },
] as const;

export function loadGoldenOcrFixture(entry: GoldenOcrFixtureEntry): VisionOcrExtract {
  const raw = JSON.parse(
    readFileSync(join(GOLDEN_DIR, entry.ocrFile), "utf8")
  );
  return raw as VisionOcrExtract;
}

export function goldenOcrImagePath(entry: GoldenOcrFixtureEntry): string {
  return join(RECEIPT_IMAGE_DIR, entry.imageFile);
}

export function loadAllGoldenOcrFixtures(): Array<{
  entry: GoldenOcrFixtureEntry;
  ocr: VisionOcrExtract;
}> {
  return GOLDEN_OCR_CATALOG.map((entry) => ({
    entry,
    ocr: loadGoldenOcrFixture(entry),
  }));
}
