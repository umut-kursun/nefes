import fs from "fs";
import path from "path";
import { formatJson } from "./serialize";
import { STAGE_FILENAMES } from "./stageFilenames";

export type TraceStageFiles = Record<string, unknown>;

export function shouldSaveTraceToDisk(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.RECEIPT_ENGINE_DEBUG_SAVE === "1"
  );
}

export function saveTraceArtifacts(
  traceId: string,
  stages: TraceStageFiles,
  meta: Record<string, unknown>
): string {
  const root = path.join(process.cwd(), "debug-traces", traceId);
  fs.mkdirSync(root, { recursive: true });

  fs.writeFileSync(
    path.join(root, "00-trace-meta.json"),
    `${formatJson(meta)}\n`,
    "utf8"
  );

  for (const [key, filename] of Object.entries(STAGE_FILENAMES)) {
    const payload = stages[key];
    if (payload === undefined) continue;
    fs.writeFileSync(
      path.join(root, filename),
      `${formatJson(payload)}\n`,
      "utf8"
    );
  }

  return root;
}

export { STAGE_FILENAMES } from "./stageFilenames";
