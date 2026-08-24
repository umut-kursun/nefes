import fs from "node:fs";
import path from "node:path";
import { buildValidationReport } from "@/lib/receipt-engine/layer-7-validate/buildValidationReport";
import { stripValidatedPurchase } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import {
  FIXTURE_CATALOG,
  fixtureExpectedDir,
  loadFixturePurchase,
} from "@/lib/receipt-engine/fixtures/fixtureRegistry";
import {
  REAL_RECEIPT_CATALOG,
  type RealReceiptRef,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { loadRealReceiptPurchase } from "@/lib/receipt-engine/fixtures/realReceiptRegistry";

function realReceiptValidationPath(ref: RealReceiptRef): string {
  return path.join(
    process.cwd(),
    "src/lib/receipt-engine/fixtures/real",
    ref.merchant,
    "expected",
    `${ref.name}.validation.json`
  );
}

for (const ref of FIXTURE_CATALOG) {
  const purchase = loadFixturePurchase(ref);
  const actual = stripValidatedPurchase(buildValidationReport(purchase));
  const goldenPath = path.join(fixtureExpectedDir(ref), `${ref.name}.validation.json`);
  fs.writeFileSync(goldenPath, `${JSON.stringify(actual, null, 2)}\n`, "utf8");
  console.log("updated", goldenPath);
}

for (const ref of REAL_RECEIPT_CATALOG) {
  const purchase = loadRealReceiptPurchase(ref);
  const actual = stripValidatedPurchase(buildValidationReport(purchase));
  const goldenPath = realReceiptValidationPath(ref);
  fs.writeFileSync(goldenPath, `${JSON.stringify(actual, null, 2)}\n`, "utf8");
  console.log("updated", goldenPath);
}
