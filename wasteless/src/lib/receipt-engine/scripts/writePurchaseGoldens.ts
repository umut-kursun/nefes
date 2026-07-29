/**
 * One-off script to regenerate L6 purchase goldens from BlockDocument fixtures.
 * Usage: npx tsx src/lib/receipt-engine/scripts/writePurchaseGoldens.ts
 */
import fs from "fs";
import path from "path";
import { buildPurchaseDraft } from "../layer-6-purchase/buildPurchaseDraft";
import {
  FIXTURE_CATALOG,
  fixtureExpectedDir,
  loadFixtureBlocks,
} from "../fixtures/fixtureRegistry";

for (const ref of FIXTURE_CATALOG) {
  const blocks = loadFixtureBlocks(ref);
  const purchase = buildPurchaseDraft(blocks);
  const outDir = fixtureExpectedDir(ref);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${ref.name}.purchase.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(purchase, null, 2)}\n`, "utf8");
  console.log(`wrote ${outPath}`);
}
