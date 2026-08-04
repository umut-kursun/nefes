import {
  DEFAULT_ENGINE_CONFIG,
  resolveEngineConfig,
} from "@/lib/receipt-engine/config/defaults";
import type { EngineConfig } from "@/lib/receipt-engine/types/pipeline";
import type { Confidence } from "@/lib/receipt-engine/types/provenance";
import {
  createMerchantProfileRegistry,
  type MerchantProfileRegistry,
} from "@/lib/receipt-engine-quality/profiles/merchantProfileRegistry";

export interface SdkConfidenceThresholds {
  readonly overall: Confidence;
  readonly merchant: Confidence;
  readonly products: Confidence;
  readonly validation: Confidence;
}

export interface SdkEngineModes {
  readonly debug: boolean;
  readonly quality: boolean;
  readonly performance: boolean;
  readonly validation: boolean;
}

export type ParserMode = "ocr_then_deterministic" | "vision_first";

export interface SdkEngineConfig extends EngineConfig {
  readonly language: string;
  readonly currency: string;
  readonly country: string;
  readonly merchantProfiles: MerchantProfileRegistry;
  readonly modes: SdkEngineModes;
  readonly confidenceThresholds: SdkConfidenceThresholds;
  readonly ocrProviderId: string;
  readonly parserMode: ParserMode;
}

const DEFAULT_MODES: SdkEngineModes = {
  debug: false,
  quality: true,
  performance: true,
  validation: true,
};

const DEFAULT_CONFIDENCE_THRESHOLDS: SdkConfidenceThresholds = {
  overall: 0.5,
  merchant: 0.4,
  products: 0.4,
  validation: 0.5,
};

export const DEFAULT_SDK_ENGINE_CONFIG: SdkEngineConfig = {
  ...DEFAULT_ENGINE_CONFIG,
  language: "tr",
  currency: "TRY",
  country: "TR",
  merchantProfiles: createMerchantProfileRegistry(),
  modes: DEFAULT_MODES,
  confidenceThresholds: DEFAULT_CONFIDENCE_THRESHOLDS,
  ocrProviderId: "mock",
  parserMode: "vision_first",
};

export type PartialSdkEngineConfig = Partial<
  Omit<SdkEngineConfig, "merchantProfiles" | "modes" | "confidenceThresholds">
> & {
  merchantProfiles?: MerchantProfileRegistry;
  modes?: Partial<SdkEngineModes>;
  confidenceThresholds?: Partial<SdkConfidenceThresholds>;
};

/** Merge partial SDK config with engine defaults and plugin-driven options. */
export function resolveSdkConfig(
  partial?: PartialSdkEngineConfig
): SdkEngineConfig {
  const engine = resolveEngineConfig(partial);
  return {
    ...DEFAULT_SDK_ENGINE_CONFIG,
    ...engine,
    ...partial,
    modes: {
      ...DEFAULT_MODES,
      ...partial?.modes,
      debug: partial?.modes?.debug ?? partial?.debug ?? engine.debug,
    },
    confidenceThresholds: {
      ...DEFAULT_CONFIDENCE_THRESHOLDS,
      ...partial?.confidenceThresholds,
    },
    merchantProfiles:
      partial?.merchantProfiles ?? DEFAULT_SDK_ENGINE_CONFIG.merchantProfiles,
    ocrProviderId:
      partial?.ocrProviderId ?? DEFAULT_SDK_ENGINE_CONFIG.ocrProviderId,
    parserMode:
      partial?.parserMode ?? DEFAULT_SDK_ENGINE_CONFIG.parserMode,
    language: partial?.language ?? DEFAULT_SDK_ENGINE_CONFIG.language,
    currency: partial?.currency ?? DEFAULT_SDK_ENGINE_CONFIG.currency,
    country: partial?.country ?? DEFAULT_SDK_ENGINE_CONFIG.country,
  };
}
