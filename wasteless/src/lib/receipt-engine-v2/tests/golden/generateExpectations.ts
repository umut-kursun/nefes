import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runReceiptEngineV2 } from "../../engine/runReceiptEngineV2";
import { purchaseToGoldenExpectation } from "./GoldenExpectation";
import {
  buildVisionResult,
  listGoldenReceiptDraftSlugs,
  loadGoldenReceiptDraft,
} from "./GoldenReceipt";

function goldenCasesRoot(): string {
  if (typeof __dirname !== "undefined") {
    return path.join(__dirname, "fixtures", "cases");
  }
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "fixtures",
    "cases"
  );
}

/** Write expected.json snapshots for every OCR fixture draft. */
export function generateGoldenExpectations(): string[] {
  const written: string[] = [];

  for (const slug of listGoldenReceiptDraftSlugs()) {
    const draft = loadGoldenReceiptDraft(slug);
    const result = runReceiptEngineV2(buildVisionResult(draft));
    const expected = purchaseToGoldenExpectation(result.purchase);
    const target = path.join(goldenCasesRoot(), slug, "expected.json");

    fs.writeFileSync(target, `${JSON.stringify(expected, null, 2)}\n`, "utf8");
    written.push(target);
  }

  return written;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("generateExpectations.ts")) {
  const files = generateGoldenExpectations();
  console.log(`Generated ${files.length} golden expectation file(s).`);
  for (const file of files) {
    console.log(`  ${file}`);
  }
}
