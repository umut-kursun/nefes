export type {
  OcrProvider,
  OcrExtractInput,
  OcrExtractOutput,
} from "@/lib/receipt-engine/layer-1-ocr/providers/ocrProvider";

export {
  createOcrProvider,
  createMockOcrProvider,
  createOpenAiOcrProvider,
  EMPTY_MOCK_OCR_PROVIDER,
} from "@/lib/receipt-engine/layer-1-ocr/providers/providerFactory";
