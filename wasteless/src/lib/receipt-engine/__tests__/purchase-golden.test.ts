import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import type { BlockDocument } from "@/lib/receipt-engine/types/models/blocks";
import { buildBlockDocument } from "@/lib/receipt-engine/layer-5-blocks/buildBlockDocument";
import { buildPurchaseDraft } from "@/lib/receipt-engine/layer-6-purchase/buildPurchaseDraft";
import {
  FIXTURE_CATALOG,
  loadFixtureBlocks,
  loadFixtureClassified,
  fixtureExpectedDir,
} from "@/lib/receipt-engine/fixtures/fixtureRegistry";

function blocksFromFixture(ref: (typeof FIXTURE_CATALOG)[number]): BlockDocument {
  try {
    return loadFixtureBlocks(ref);
  } catch {
    const classified = loadFixtureClassified(ref);
    return buildBlockDocument(classified);
  }
}

describe("Layer 6 — golden PurchaseDraft fixtures", () => {
  for (const ref of FIXTURE_CATALOG) {
    it(`matches golden purchase for ${ref.category}/${ref.name}`, () => {
      const blocks = blocksFromFixture(ref);
      const actual = buildPurchaseDraft(blocks);
      const goldenPath = path.join(
        fixtureExpectedDir(ref),
        `${ref.name}.purchase.json`
      );
      const expected = JSON.parse(
        fs.readFileSync(goldenPath, "utf8")
      ) as typeof actual;
      expect(actual).toEqual(expected);
    });
  }
});
