/** Raw OCR line — no business logic (Stage 1 output). */

export type RawLine = {
  readonly index: number;
  readonly text: string;
  readonly confidence: number;
  readonly page: number;
  readonly bbox?: { x: number; y: number; w: number; h: number };
};

export type RawLineDocument = {
  readonly lines: readonly RawLine[];
  readonly rawText: string;
};
