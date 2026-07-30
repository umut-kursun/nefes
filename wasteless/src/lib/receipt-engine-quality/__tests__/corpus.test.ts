import { describe, expect, it } from "vitest";
import fs from "fs";
import {
  CORPUS_CATALOG,
  CORPUS_ARTIFACTS,
  corpusArtifactPath,
} from "../corpus/corpusRegistry";

describe("corpus registry", () => {
  it("catalog matches REAL_RECEIPT_CATALOG count", () => {
    expect(CORPUS_CATALOG).toHaveLength(7);
  });

  it("corpus artifacts exist after build for all receipts", () => {
    for (const entry of CORPUS_CATALOG) {
      for (const artifact of CORPUS_ARTIFACTS) {
        expect(fs.existsSync(corpusArtifactPath(entry.slug, artifact))).toBe(
          true
        );
      }
    }
  });
});
