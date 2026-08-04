import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import {
  loadRealReceiptOcr,
  REAL_RECEIPT_CATALOG,
  type RealReceiptMerchantSlug,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import type { GoldenFixture, GoldenFixtureMeta } from "./types";
import { GOLDEN_FIXTURE_CATALOG } from "./catalog";

function goldenRoot(): string {
  if (typeof __dirname !== "undefined") {
    return path.join(__dirname, "cases");
  }
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "cases");
}

function fixtureDir(slug: string): string {
  return path.join(goldenRoot(), slug);
}

export function loadGoldenFixture(slug: string): GoldenFixture {
  const metaEntry = GOLDEN_FIXTURE_CATALOG.find((f) => f.slug === slug);
  if (!metaEntry) throw new Error(`Unknown golden fixture: ${slug}`);

  const dir = fixtureDir(slug);
  const metaPath = path.join(dir, "meta.json");
  const meta = fs.existsSync(metaPath)
    ? (JSON.parse(fs.readFileSync(metaPath, "utf8")) as GoldenFixtureMeta)
    : metaEntry;

  const expectedPath = path.join(dir, "expected.purchase.json");
  const expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"));

  let ocrText: string;
  if (meta.legacyRef) {
    const legacy = REAL_RECEIPT_CATALOG.find((r) => r.merchant === meta.legacyRef);
    if (!legacy) throw new Error(`Missing legacy ref: ${meta.legacyRef}`);
    ocrText = loadRealReceiptOcr(legacy).rawText;
  } else {
    ocrText = fs.readFileSync(path.join(dir, "ocr.txt"), "utf8");
  }

  return { meta, ocrText, expected };
}

export function loadAllGoldenFixtures(): GoldenFixture[] {
  return GOLDEN_FIXTURE_CATALOG.map((entry) => loadGoldenFixture(entry.slug));
}

export function isLegacySlug(slug: string): slug is RealReceiptMerchantSlug {
  return REAL_RECEIPT_CATALOG.some((r) => r.merchant === slug);
}
