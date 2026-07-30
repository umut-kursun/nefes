import { describe, expect, it } from "vitest";
import {
  CORPUS_VERSION,
  ENGINE_VERSION,
  GOLDEN_VERSION,
  PARSER_VERSION,
  REGRESSION_VERSION,
  SCHEMA_VERSION,
  resolveVersionMetadata,
} from "../versioning/versions";

describe("version metadata", () => {
  it("returns stable version bundle for results", () => {
    const versions = resolveVersionMetadata();

    expect(versions.engine).toBe(ENGINE_VERSION);
    expect(versions.schema).toBe(SCHEMA_VERSION);
    expect(versions.corpus).toBe(CORPUS_VERSION);
    expect(versions.golden).toBe(GOLDEN_VERSION);
    expect(versions.regression).toBe(REGRESSION_VERSION);
    expect(versions.parser).toBe(PARSER_VERSION);
  });
});
