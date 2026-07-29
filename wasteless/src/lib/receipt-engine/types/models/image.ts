import type { Confidence } from "../provenance";

export type ImageVariant = "enhanced" | "threshold";

export interface ProcessedImage {
  dataUrl: string;
  variant: ImageVariant;
  width: number;
  height: number;
  preprocessMs: number;
}

export interface ImageMeta {
  capturedAt?: string;
  devicePixelRatio?: number;
  orientation?: number;
  /** Test-only fixture key — consumed by MockOcrProvider, not used below L1. */
  fixtureKey?: string;
}

export interface ImageBundle {
  primary: ProcessedImage;
  alt?: ProcessedImage;
  meta: ImageMeta;
}

export function emptyImageBundle(dataUrl = ""): ImageBundle {
  return {
    primary: {
      dataUrl,
      variant: "enhanced",
      width: 0,
      height: 0,
      preprocessMs: 0,
    },
    meta: {},
  };
}

export interface OcrQuality {
  charCount: number;
  lineCount: number;
  score: Confidence;
}

export interface OcrHints {
  merchantGuess?: string | null;
  dateGuess?: string | null;
  timeGuess?: string | null;
  confidence: Confidence;
}

export interface OcrBoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface OcrLineDetail {
  readonly text: string;
  readonly confidence?: Confidence;
  readonly bbox?: OcrBoundingBox;
}

export type OcrSource =
  | "vision_primary"
  | "vision_alt"
  | "fallback_text"
  | "mock"
  | "stub";

export interface OcrDocument {
  readonly rawText: string;
  readonly lines: readonly string[];
  readonly lineDetails?: readonly OcrLineDetail[];
  readonly source: OcrSource;
  readonly quality: OcrQuality;
  readonly hints?: OcrHints;
}

export function emptyOcrDocument(rawText = ""): OcrDocument {
  return {
    rawText,
    lines: Object.freeze([]),
    source: "stub",
    quality: {
      charCount: rawText.length,
      lineCount: 0,
      score: 0,
    },
  };
}
