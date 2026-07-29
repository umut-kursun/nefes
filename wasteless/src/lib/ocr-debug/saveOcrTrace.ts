import fs from "fs";
import path from "path";
import { formatJson } from "@/lib/receipt-engine-debug/serialize";

export function shouldSaveOcrDebugToDisk(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.OCR_DEBUG_SAVE === "1"
  );
}

export function saveOcrDebugResponse(
  traceId: string,
  payload: unknown
): string {
  const root = path.join(process.cwd(), "debug-traces", traceId);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, "raw-response.json"),
    `${formatJson(payload)}\n`,
    "utf8"
  );
  return root;
}
