import fs from "fs";
import path from "path";
import type { BlockDocument } from "../types/models/blocks";
import type { ClassifiedGraph } from "../types/models/classify";
import type { LayoutDocument } from "../types/models/layout";
import type { ReceiptGraph } from "../types/models/graph";
import type { PurchaseDraft } from "../types/models/purchase";
import type { OcrDocument } from "../types/models/image";
import { ocrDocumentFromRaw } from "./ocrFromRaw";

export type FixtureCategory =
  | "supermarket"
  | "convenience"
  | "pharmacy"
  | "restaurant"
  | "fuel"
  | "malformed"
  | "weighted"
  | "multi-payment"
  | "discount"
  | "multi-vat"
  | "split-payment"
  | "refund"
  | "credit-note"
  | "malformed-ocr";

export type FixtureStage =
  | "layout"
  | "graph"
  | "classified"
  | "blocks"
  | "purchase"
  | "validation";

export interface FixtureRef {
  readonly category: FixtureCategory;
  readonly name: string;
}

export const FIXTURE_CATALOG: readonly FixtureRef[] = Object.freeze([
  { category: "supermarket", name: "with-bag" },
  { category: "supermarket", name: "products-only" },
  { category: "weighted", name: "weighted-continuation" },
  { category: "multi-payment", name: "footer-payments" },
]);

export const LEGACY_TR_SUPERMARKET_MAP: Readonly<
  Record<string, FixtureRef>
> = Object.freeze({
  "with-bag": { category: "supermarket", name: "with-bag" },
  "products-only": { category: "supermarket", name: "products-only" },
  "weighted-continuation": {
    category: "weighted",
    name: "weighted-continuation",
  },
  "footer-payments": { category: "multi-payment", name: "footer-payments" },
});

const FIXTURES_ROOT = path.join(__dirname);

export function fixtureDir(ref: FixtureRef): string {
  return path.join(FIXTURES_ROOT, ref.category);
}

export function fixtureExpectedDir(ref: FixtureRef): string {
  return path.join(fixtureDir(ref), "expected");
}

export function loadFixtureOcr(ref: FixtureRef): OcrDocument {
  const txtPath = path.join(fixtureDir(ref), `${ref.name}.txt`);
  const rawText = fs.readFileSync(txtPath, "utf8");
  return ocrDocumentFromRaw(rawText);
}

export function loadFixtureStage<T>(
  ref: FixtureRef,
  stage: FixtureStage
): T {
  const filePath = path.join(
    fixtureExpectedDir(ref),
    `${ref.name}.${stage}.json`
  );
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function loadFixtureLayout(ref: FixtureRef): LayoutDocument {
  return loadFixtureStage(ref, "layout");
}

export function loadFixtureGraph(ref: FixtureRef): ReceiptGraph {
  return loadFixtureStage(ref, "graph");
}

export function loadFixtureClassified(ref: FixtureRef): ClassifiedGraph {
  const graph = loadFixtureGraph(ref);
  const golden = loadFixtureStage<{
    nodes: ClassifiedGraph["nodes"];
    confidence: number;
  }>(ref, "classified");
  return { graph, nodes: golden.nodes, confidence: golden.confidence };
}

export function loadFixtureBlocks(ref: FixtureRef): BlockDocument {
  return loadFixtureStage(ref, "blocks");
}

export function loadFixturePurchase(ref: FixtureRef): PurchaseDraft {
  return loadFixtureStage(ref, "purchase");
}

export function loadFixtureValidation(
  ref: FixtureRef
): Omit<import("../types/models/validation").ValidationReport, "validatedPurchase"> {
  return loadFixtureStage(ref, "validation");
}

/** Categories awaiting full pipeline fixtures. */
export const VALIDATION_PLACEHOLDER_CATEGORIES: readonly FixtureCategory[] =
  Object.freeze([
    "fuel",
    "restaurant",
    "pharmacy",
    "discount",
    "multi-vat",
    "split-payment",
    "refund",
    "credit-note",
    "malformed-ocr",
  ]);

export function resolveLegacyFixture(name: string): FixtureRef {
  const ref = LEGACY_TR_SUPERMARKET_MAP[name];
  if (!ref) throw new Error(`Unknown legacy fixture: ${name}`);
  return ref;
}

export function legacyTrSupermarketDir(): string {
  return path.join(FIXTURES_ROOT, "tr-supermarket");
}

export function legacyExpectedDir(): string {
  return path.join(legacyTrSupermarketDir(), "expected");
}
