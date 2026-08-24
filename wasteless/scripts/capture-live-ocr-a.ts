import fs from "node:fs";
import path from "node:path";
import { readReceiptWithVisionOcr } from "@/lib/receipt-engine-v2/vision/openAiVisionOcrProvider";
import { runReceiptEngineV2 } from "@/lib/receipt-engine-v2/engine/runReceiptEngineV2";
import { extractReceiptDocument } from "@/lib/receipt-engine-v2/extraction/extractReceiptDocument";
import { v2PurchaseToPurchaseDraft } from "@/lib/receipt-engine-v2-integration/v2PurchaseToPurchaseDraft";
import { buildValidationReport } from "@/lib/receipt-engine/layer-7-validate/buildValidationReport";

const envPath = path.join(process.cwd(), ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq <= 0) continue;
  process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}

const img =
  "C:/Users/ukursun/.cursor/projects/c-Users-ukursun-Documents-nefes-wasteless/assets/c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug_1-dca82703-5eae-4a72-81e3-2dc409ef3a2e.png";
const buf = fs.readFileSync(img);
const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;

async function main() {
const visionRun = await readReceiptWithVisionOcr(
  { imageDataUrl: dataUrl, altImageDataUrl: dataUrl },
  { apiKey: process.env.OPENAI_API_KEY! }
);
const vision = visionRun.result;
const doc = extractReceiptDocument(vision.lines);
const engine = runReceiptEngineV2(vision);
const draft = v2PurchaseToPurchaseDraft(engine.purchase, vision, doc);
const validation = buildValidationReport(draft);

const fixtureLines = fs
  .readFileSync(
    "src/lib/receipt-engine-v2/tests/fixtures/real-world/migros-0347/ocr.txt",
    "utf8"
  )
  .split(/\r?\n/)
  .filter(Boolean);

console.log("LIVE lines:", vision.lines.length);
vision.lines.forEach((l, i) => console.log(`${String(i).padStart(2, "0")}: ${l}`));
console.log("\nFIXTURE lines:", fixtureLines.length);
console.log("\nProducts:", doc.products.length, doc.products.map((p) => p.rawName));
console.log("Footer:", doc.footer);
console.log("Validation:", validation.analysisStatus, validation.errors.map((e) => e.code));

fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync(
  "reports/migros-a-live-ocr.json",
  JSON.stringify({ vision, doc, draft, validation, fixtureLines }, null, 2)
);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
