/**
 * Write golden.json for each corpus entry from current parser purchase output.
 * Usage: npx tsx src/lib/receipt-engine-quality/scripts/writeCorpusGoldens.ts
 */
import fs from "fs";
import path from "path";
import {
  CORPUS_CATALOG,
  corpusArtifactPath,
} from "../corpus/corpusRegistry";
import { loadRealReceiptOcr } from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { runQualityPipelineFromOcr } from "../runQualityPipeline";

for (const entry of CORPUS_CATALOG) {
  const ocr = loadRealReceiptOcr(entry.realReceipt);
  const outputs = runQualityPipelineFromOcr(ocr);
  const filePath = corpusArtifactPath(entry.slug, "golden.json");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${JSON.stringify(outputs.purchase, null, 2)}\n`,
    "utf8"
  );
  console.log(`wrote golden: ${entry.slug}`);
}
