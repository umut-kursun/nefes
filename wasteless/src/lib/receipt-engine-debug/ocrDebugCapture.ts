import type { OcrProvider } from "@/lib/receipt-engine/layer-1-ocr/providers/ocrProvider";

/** Side-channel OCR debug data captured during trace runs only. */
export type OcrDebugCapture = {
  rawVisionResponse?: string;
  rawExtractText?: string;
};

export function wrapOcrProviderWithCapture(
  provider: OcrProvider,
  capture: OcrDebugCapture
): OcrProvider {
  return {
    kind: provider.kind,
    async extract(input) {
      const output = await provider.extract(input);
      capture.rawVisionResponse = output.rawVisionResponse;
      capture.rawExtractText = output.rawText;
      return output;
    },
  };
}
