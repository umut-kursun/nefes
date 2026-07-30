import type { OcrProvider } from "@/lib/receipt-engine/layer-1-ocr/providers/ocrProvider";
import {
  createOcrProvider,
  EMPTY_MOCK_OCR_PROVIDER,
} from "@/lib/receipt-engine/layer-1-ocr/providers/providerFactory";
import type { OcrProviderFactoryOptions } from "@/lib/receipt-engine/layer-1-ocr/providers/providerFactory";
import {
  STUB_AWS_TEXTRACT,
  STUB_AZURE_OCR,
  STUB_GOOGLE_VISION,
  STUB_LOCAL_OCR,
  STUB_TESSERACT,
} from "./providers/stubs";

const registry = new Map<string, OcrProvider>();

function registerDefaults(): void {
  registry.set("mock", EMPTY_MOCK_OCR_PROVIDER);
  registry.set("openai", EMPTY_MOCK_OCR_PROVIDER);
  registry.set("google-vision", STUB_GOOGLE_VISION);
  registry.set("azure-ocr", STUB_AZURE_OCR);
  registry.set("aws-textract", STUB_AWS_TEXTRACT);
  registry.set("tesseract", STUB_TESSERACT);
  registry.set("local-ocr", STUB_LOCAL_OCR);
}

registerDefaults();

export const ocrProviderRegistry = {
  register(id: string, provider: OcrProvider): void {
    registry.set(id, provider);
  },

  get(id: string): OcrProvider | undefined {
    return registry.get(id);
  },

  resolve(
    id: string,
    factoryOptions?: OcrProviderFactoryOptions
  ): OcrProvider {
    if (id === "openai" && factoryOptions?.openAi?.apiKey) {
      return createOcrProvider({ kind: "openai", openAi: factoryOptions.openAi });
    }
    if (id === "mock" && factoryOptions?.mock) {
      return createOcrProvider({ kind: "mock", mock: factoryOptions.mock });
    }
    const provider = registry.get(id);
    if (!provider) {
      throw new Error(
        `Unknown OCR provider "${id}". Available: ${Array.from(registry.keys()).join(", ")}`
      );
    }
    return provider;
  },

  list(): readonly string[] {
    return Array.from(registry.keys());
  },
};

export type { OcrProviderFactoryOptions };
