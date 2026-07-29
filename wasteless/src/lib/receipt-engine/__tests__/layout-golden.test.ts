import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import type { LayoutDocument } from "@/lib/receipt-engine/types/models/layout";
import { reconstructLayout } from "@/lib/receipt-engine/layer-2-layout/layoutReconstructor";
import { ocrDocumentFromRaw } from "@/lib/receipt-engine/fixtures/ocrFromRaw";

const FIXTURE_DIR = path.join(__dirname, "../fixtures/tr-supermarket");
const GOLDEN_DIR = path.join(FIXTURE_DIR, "expected");

function loadGolden(name: string): LayoutDocument {
  const raw = fs.readFileSync(path.join(GOLDEN_DIR, `${name}.layout.json`), "utf8");
  return JSON.parse(raw) as LayoutDocument;
}

function layoutFromOcrFixture(name: string): LayoutDocument {
  const raw = fs.readFileSync(path.join(FIXTURE_DIR, `${name}.txt`), "utf8");
  return reconstructLayout(ocrDocumentFromRaw(raw), "generic-tr");
}

function assertLayoutEqual(actual: LayoutDocument, expected: LayoutDocument): void {
  expect(actual).toEqual(expected);
}

const GOLDEN_FIXTURES = [
  "with-bag",
  "products-only",
  "weighted-continuation",
  "footer-payments",
] as const;

describe("Layer 2 — golden LayoutDocument fixtures", () => {
  for (const name of GOLDEN_FIXTURES) {
    it(`matches golden layout for ${name}`, () => {
      assertLayoutEqual(layoutFromOcrFixture(name), loadGolden(name));
    });
  }
});
