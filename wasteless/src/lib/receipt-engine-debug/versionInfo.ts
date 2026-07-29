import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { RECEIPT_ENGINE_VERSION } from "@/lib/receipt-engine/types/pipeline";

export const DEBUG_SCHEMA_VERSION = "1.0.0";

export type DebugVersionInfo = {
  engineVersion: string;
  schemaVersion: string;
  buildVersion: string;
  gitCommit: string | null;
};

let cachedGitCommit: string | null | undefined;

function readPackageVersion(): string {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export function resolveGitCommit(): string | null {
  if (cachedGitCommit !== undefined) return cachedGitCommit;
  try {
    const commit = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    cachedGitCommit = commit || null;
  } catch {
    cachedGitCommit = null;
  }
  return cachedGitCommit;
}

export function resolveDebugVersionInfo(): DebugVersionInfo {
  return {
    engineVersion: RECEIPT_ENGINE_VERSION,
    schemaVersion: DEBUG_SCHEMA_VERSION,
    buildVersion: readPackageVersion(),
    gitCommit: resolveGitCommit(),
  };
}
