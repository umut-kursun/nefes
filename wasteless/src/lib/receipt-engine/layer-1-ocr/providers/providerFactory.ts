import { createMockOcrProvider, EMPTY_MOCK_OCR_PROVIDER } from "./mockOcrProvider";
import type { MockOcrProviderOptions } from "./mockOcrProvider";
import { createOpenAiOcrProvider } from "./openAiOcrProvider";
import type { OpenAiOcrProviderOptions } from "./openAiOcrProvider";
import type { OcrProvider } from "./ocrProvider";

export type OcrProviderKind = "mock" | "openai";

export interface OcrProviderFactoryOptions {
  readonly kind?: OcrProviderKind;
  readonly mock?: MockOcrProviderOptions;
  readonly openAi?: OpenAiOcrProviderOptions;
}

export function createOcrProvider(
  options: OcrProviderFactoryOptions = {}
): OcrProvider {
  const kind = options.kind ?? inferDefaultKind(options);

  if (kind === "openai") {
    if (!options.openAi?.apiKey) {
      throw new Error("OpenAI OCR provider requires apiKey");
    }
    return createOpenAiOcrProvider(options.openAi);
  }

  return createMockOcrProvider(options.mock ?? {});
}

function inferDefaultKind(options: OcrProviderFactoryOptions): OcrProviderKind {
  if (options.openAi?.apiKey) return "openai";
  return "mock";
}

export function createOcrProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env
): OcrProvider {
  const apiKey = env.OPENAI_API_KEY;
  if (apiKey) {
    return createOcrProvider({
      kind: "openai",
      openAi: {
        apiKey,
        model: env.OPENAI_OCR_MODEL ?? env.OPENAI_VISION_MODEL,
      },
    });
  }
  return EMPTY_MOCK_OCR_PROVIDER;
}

export {
  createMockOcrProvider,
  EMPTY_MOCK_OCR_PROVIDER,
} from "./mockOcrProvider";
export { createOpenAiOcrProvider } from "./openAiOcrProvider";
export type { OcrProvider, OcrExtractInput, OcrExtractOutput } from "./ocrProvider";
