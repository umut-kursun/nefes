/** Grouped OCR product lines — no parsed amounts or purchase semantics. */
export type ProductBlock = {
  readonly productLine: string;
  readonly quantityLine: string | null;
  readonly discountLines: readonly string[];
};

export type ProductBlockBuildResult = {
  readonly blocks: readonly ProductBlock[];
};
