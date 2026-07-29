import fs from "fs";
import path from "path";
import type { FixtureRef } from "../fixtureRegistry";

export type OcrFixtureCategory =
  | "supermarket"
  | "fuel"
  | "restaurant"
  | "pharmacy"
  | "malformed"
  | "low-confidence"
  | "blurred";

export interface OcrFixtureRef {
  readonly category: OcrFixtureCategory;
  readonly name: string;
  readonly pipelineGolden?: FixtureRef;
}

export interface OcrFixtureMeta {
  readonly lineConfidences?: readonly number[];
}

/** Fixtures with linked L6 purchase goldens — used for OCR→PurchaseDraft e2e. */
export const OCR_E2E_CATALOG: readonly OcrFixtureRef[] = Object.freeze([
  {
    category: "supermarket",
    name: "with-bag",
    pipelineGolden: { category: "supermarket", name: "with-bag" },
  },
  {
    category: "supermarket",
    name: "products-only",
    pipelineGolden: { category: "supermarket", name: "products-only" },
  },
  {
    category: "supermarket",
    name: "weighted-continuation",
    pipelineGolden: { category: "weighted", name: "weighted-continuation" },
  },
  {
    category: "supermarket",
    name: "footer-payments",
    pipelineGolden: { category: "multi-payment", name: "footer-payments" },
  },
  {
    category: "malformed",
    name: "with-bag",
    pipelineGolden: { category: "supermarket", name: "with-bag" },
  },
]);

export const OCR_QUALITY_CATALOG: readonly OcrFixtureRef[] = Object.freeze([
  { category: "low-confidence", name: "with-bag" },
  { category: "blurred", name: "with-bag" },
]);

const OCR_ROOT = __dirname;

export function ocrFixturePath(ref: OcrFixtureRef): string {
  return path.join(OCR_ROOT, ref.category, `${ref.name}.txt`);
}

export function ocrFixtureMetaPath(ref: OcrFixtureRef): string {
  return path.join(OCR_ROOT, ref.category, `${ref.name}.meta.json`);
}

export function loadOcrFixtureText(ref: OcrFixtureRef): string {
  return fs.readFileSync(ocrFixturePath(ref), "utf8");
}

export function loadOcrFixtureMeta(ref: OcrFixtureRef): OcrFixtureMeta | null {
  const metaPath = ocrFixtureMetaPath(ref);
  if (!fs.existsSync(metaPath)) return null;
  return JSON.parse(fs.readFileSync(metaPath, "utf8")) as OcrFixtureMeta;
}

export function ocrFixtureKey(ref: OcrFixtureRef): string {
  return `${ref.category}/${ref.name}`;
}

export function createOcrFixtureLoader(): (
  fixtureKey: string
) => { rawText: string; lineConfidences?: readonly number[] } | null {
  const all = [...OCR_E2E_CATALOG, ...OCR_QUALITY_CATALOG];
  const byKey = new Map(all.map((ref) => [ocrFixtureKey(ref), ref]));

  return (fixtureKey: string) => {
    const ref = byKey.get(fixtureKey);
    if (!ref) return null;
    const meta = loadOcrFixtureMeta(ref);
    return {
      rawText: loadOcrFixtureText(ref),
      lineConfidences: meta?.lineConfidences,
    };
  };
}
