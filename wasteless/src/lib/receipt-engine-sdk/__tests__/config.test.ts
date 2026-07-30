import { describe, expect, it } from "vitest";
import {
  DEFAULT_SDK_ENGINE_CONFIG,
  resolveSdkConfig,
} from "../config/SdkEngineConfig";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/receipt-engine/config/defaults";

describe("resolveSdkConfig", () => {
  it("merges partial config with engine defaults", () => {
    const config = resolveSdkConfig({
      language: "en",
      currency: "USD",
      country: "US",
      debug: true,
    });

    expect(config.language).toBe("en");
    expect(config.currency).toBe("USD");
    expect(config.country).toBe("US");
    expect(config.debug).toBe(true);
    expect(config.failOnBlockingValidation).toBe(
      DEFAULT_ENGINE_CONFIG.failOnBlockingValidation
    );
    expect(config.defaultLayoutProfileId).toBe(
      DEFAULT_SDK_ENGINE_CONFIG.defaultLayoutProfileId
    );
  });

  it("merges nested modes and confidence thresholds", () => {
    const config = resolveSdkConfig({
      modes: { performance: false },
      confidenceThresholds: { overall: 0.8 },
    });

    expect(config.modes.performance).toBe(false);
    expect(config.modes.quality).toBe(true);
    expect(config.confidenceThresholds.overall).toBe(0.8);
    expect(config.confidenceThresholds.merchant).toBe(0.4);
  });
});
