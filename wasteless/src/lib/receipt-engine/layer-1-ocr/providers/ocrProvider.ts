import type { OcrBoundingBox, OcrLineDetail, OcrSource } from "../../types/models/image";

/** Raw OCR payload before normalization — provider-internal only. */
export interface OcrExtractLine {
  text: string;
  confidence?: number;
  bbox?: OcrBoundingBox;
}

export interface OcrExtractInput {
  readonly imageDataUrl: string;
  readonly altImageDataUrl?: string;
  readonly fixtureKey?: string;
}

export interface OcrExtractOutput {
  readonly rawText: string;
  readonly lines?: readonly OcrExtractLine[];
  readonly source: OcrSource;
  readonly documentConfidence?: number;
}

export interface OcrProvider {
  readonly kind: string;
  extract(input: OcrExtractInput): Promise<OcrExtractOutput>;
}

export type { OcrLineDetail, OcrBoundingBox };
