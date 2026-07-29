import type { EngineConfig } from "../types/pipeline";
import type { LayoutProfileRegistry } from "../config/profiles";
import { createStubLayoutProfileRegistry } from "../config/profiles";
import {
  createOcrProvider,
  EMPTY_MOCK_OCR_PROVIDER,
} from "../layer-1-ocr/providers/providerFactory";
import type {
  OcrProvider,
  OcrProviderFactoryOptions,
} from "../layer-1-ocr/providers/providerFactory";

/** Injectable services shared across layers — no v1 parser imports. */
export interface EngineDependencies {
  config: EngineConfig;
  layoutProfiles: LayoutProfileRegistry;
  ocrProvider: OcrProvider;
  /** Reserved for Phase 4 — AI transport. */
  aiGateway?: AiGateway;
  /** Reserved for Phase 3 — catalog + dictionaries. */
  knowledgeContext?: KnowledgeContextStub;
}

export interface AiGateway {
  readonly available: boolean;
}

export interface KnowledgeContextStub {
  readonly catalogLoaded: boolean;
}

export interface EngineDependenciesOptions {
  config: EngineConfig;
  layoutProfiles?: LayoutProfileRegistry;
  ocrProvider?: OcrProvider;
  ocrProviderOptions?: OcrProviderFactoryOptions;
  aiGateway?: AiGateway;
  knowledgeContext?: KnowledgeContextStub;
}

export function createEngineDependencies(
  options: EngineDependenciesOptions
): EngineDependencies {
  return {
    config: options.config,
    layoutProfiles:
      options.layoutProfiles ??
      createStubLayoutProfileRegistry(options.config.defaultLayoutProfileId),
    ocrProvider:
      options.ocrProvider ??
      (options.ocrProviderOptions
        ? createOcrProvider(options.ocrProviderOptions)
        : EMPTY_MOCK_OCR_PROVIDER),
    aiGateway: options.aiGateway,
    knowledgeContext: options.knowledgeContext,
  };
}

export const STUB_AI_GATEWAY: AiGateway = { available: false };

export const STUB_KNOWLEDGE_CONTEXT: KnowledgeContextStub = {
  catalogLoaded: false,
};

export type { OcrProvider, OcrProviderFactoryOptions };
