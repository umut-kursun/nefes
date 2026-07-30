import type { OcrProvider } from "@/lib/receipt-engine/layer-1-ocr/providers/ocrProvider";

function notImplemented(id: string): OcrProvider {
  return {
    kind: id,
    async extract() {
      throw new Error(
        `OCR provider "${id}" is not implemented. Register a custom provider via ocrProviderRegistry.register() or use "openai" / "mock".`
      );
    },
  };
}

export const STUB_GOOGLE_VISION = notImplemented("google-vision");
export const STUB_AZURE_OCR = notImplemented("azure-ocr");
export const STUB_AWS_TEXTRACT = notImplemented("aws-textract");
export const STUB_TESSERACT = notImplemented("tesseract");
export const STUB_LOCAL_OCR = notImplemented("local-ocr");
