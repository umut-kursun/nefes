import type { LineKind } from "./LineKind";

/** One OCR line with a syntactic label — no purchase semantics. */
export type TokenizedLine = {
  readonly kind: LineKind;
  readonly raw: string;
};

export type TokenizedReceipt = {
  readonly lines: readonly TokenizedLine[];
};
