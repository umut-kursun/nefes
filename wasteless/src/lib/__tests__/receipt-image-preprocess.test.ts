import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_EDGE,
  HIGH_RES_MAX_EDGE,
  LOW_VISION_QUALITY_THRESHOLD,
  shouldRetryWithHigherResolution,
} from "../receipt-image-preprocess";

describe("shouldRetryWithHigherResolution", () => {
  it("retries when validation is inconsistent", () => {
    expect(shouldRetryWithHigherResolution({ consistent: false })).toBe(true);
  });

  it("retries when validation score is below threshold", () => {
    expect(
      shouldRetryWithHigherResolution({
        validationScore: LOW_VISION_QUALITY_THRESHOLD - 1,
        consistent: true,
      })
    ).toBe(true);
  });

  it("skips retry when quality is acceptable", () => {
    expect(
      shouldRetryWithHigherResolution({
        validationScore: 95,
        consistent: true,
        confidence: 0.9,
      })
    ).toBe(false);
  });

  it("exports default and high-res edge constants", () => {
    expect(DEFAULT_MAX_EDGE).toBe(1280);
    expect(HIGH_RES_MAX_EDGE).toBe(2048);
    expect(HIGH_RES_MAX_EDGE).toBeGreaterThan(DEFAULT_MAX_EDGE);
  });
});
