import type { RawLine } from "./raw-line";

/** Layout block kinds before semantic classification. */
export type LayoutBlockKind =
  | "line_group"
  | "single_line";

export type LayoutBlock = {
  readonly id: string;
  readonly kind: LayoutBlockKind;
  readonly lines: readonly RawLine[];
  readonly text: string;
};

export type LayoutDocument = {
  readonly blocks: readonly LayoutBlock[];
  readonly lineCount: number;
};
