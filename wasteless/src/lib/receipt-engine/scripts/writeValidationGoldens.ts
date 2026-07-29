/**
 * Regenerate L7 validation goldens from PurchaseDraft fixtures.
 * Usage: npx tsx src/lib/receipt-engine/scripts/writeValidationGoldens.ts
 */
import fs from "fs";
import path from "path";
import { buildValidationReport } from "../layer-7-validate/buildValidationReport";
import {
  FIXTURE_CATALOG,
  fixtureExpectedDir,
  loadFixturePurchase,
} from "../fixtures/fixtureRegistry";
import { stripValidatedPurchase } from "../layer-7-validate/stripValidatedPurchase";

for (const ref of FIXTURE_CATALOG) {
  const purchase = loadFixturePurchase(ref);
  const report = buildValidationReport(purchase);
  const outDir = fixtureExpectedDir(ref);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${ref.name}.validation.json`);
  fs.writeFileSync(
    outPath,
    `${JSON.stringify(stripValidatedPurchase(report), null, 2)}\n`,
    "utf8"
  );
  console.log(`wrote ${outPath}`);
}
