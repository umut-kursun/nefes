import { clampConfidence } from "../../types/provenance";
import type { OcrExtractInput, OcrExtractOutput, OcrProvider } from "./ocrProvider";

export interface MockOcrFixtureLoader {
  (fixtureKey: string): {
    rawText: string;
    lineConfidences?: readonly number[];
  } | null;
}

export interface MockOcrProviderOptions {
  readonly defaultText?: string;
  readonly fixtureLoader?: MockOcrFixtureLoader;
  readonly source?: OcrExtractOutput["source"];
}

export function createMockOcrProvider(
  options: MockOcrProviderOptions = {}
): OcrProvider {
  const source = options.source ?? "mock";

  return {
    kind: "mock",

    async extract(input: OcrExtractInput): Promise<OcrExtractOutput> {
      const key = input.fixtureKey ?? input.imageDataUrl;
      let rawText = options.defaultText ?? "";
      let lineConfidences: readonly number[] | undefined;

      if (options.fixtureLoader && key) {
        const loaded = options.fixtureLoader(key);
        if (loaded) {
          rawText = loaded.rawText;
          lineConfidences = loaded.lineConfidences;
        }
      }

      const splitLines = rawText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const lines = splitLines.map((text, index) => ({
        text,
        confidence:
          lineConfidences?.[index] !== undefined
            ? clampConfidence(lineConfidences[index]!)
            : undefined,
      }));

      const avgConf =
        lines.length > 0
          ? lines.reduce((sum, l) => sum + (l.confidence ?? 0.85), 0) /
            lines.length
          : 0;

      return {
        rawText,
        lines,
        source,
        documentConfidence: clampConfidence(avgConf),
      };
    },
  };
}

export const EMPTY_MOCK_OCR_PROVIDER = createMockOcrProvider();
