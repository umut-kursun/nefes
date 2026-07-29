import type { EngineConfig } from "../types/pipeline";
import { RECEIPT_ENGINE_VERSION } from "../types/pipeline";

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  debug: false,
  engineVersion: RECEIPT_ENGINE_VERSION,
  failOnBlockingValidation: false,
  defaultLayoutProfileId: "generic-tr",
};

export function resolveEngineConfig(
  partial?: Partial<EngineConfig>
): EngineConfig {
  return {
    ...DEFAULT_ENGINE_CONFIG,
    ...partial,
  };
}
