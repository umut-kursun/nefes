/** OCR-only vision output — no products, totals, or purchase semantics. */

export interface VisionMerchant {
  readonly rawName: string | null;
  readonly rawAddress?: string | null;
  readonly rawTaxNumber?: string | null;
}

export interface VisionMetadata {
  readonly receiptNumber?: string | null;
  readonly purchaseDate?: string | null;
  readonly purchaseTime?: string | null;
  readonly currency?: string | null;
}

export interface VisionResult {
  readonly merchant?: VisionMerchant;
  readonly metadata?: VisionMetadata;
  readonly rawText: string;
  readonly lines: readonly string[];
  readonly confidence?: number;
}

export type VisionOcrInput = {
  readonly imageDataUrl: string;
  readonly altImageDataUrl?: string;
};

export type OpenAiVisionOcrOptions = {
  readonly apiKey: string;
  readonly model?: string;
  readonly imageDetail?: "auto" | "high" | "low";
  /** When false, only the primary image is sent. Default true. */
  readonly includeAltImage?: boolean;
};

export type VisionOcrTimings = {
  readonly openAiRequestMs: number;
  readonly jsonParseMs: number;
};

export type VisionOcrProviderResult = VisionOcrTimings & {
  /** Normalized OCR-only result. */
  readonly result: VisionResult;
  /** Exact OpenAI `message.content` before normalization. */
  readonly rawVisionResponse: string;
};
