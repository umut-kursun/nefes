import type { FooterData } from "../footer/FooterData";
import type { ParsedProduct } from "../parser/ParsedProduct";
import type { ProductBlock } from "../parser/ProductBlock";
import type { TokenizedLine } from "../tokenizer/TokenizedLine";
import type { VisionResult } from "../vision/types";

/** Layout family — merchant değil, fiş yapısı. */
export type LayoutFamily =
  | "supermarket"
  | "fuel"
  | "fast_food"
  | "restaurant"
  | "pharmacy"
  | "retail"
  | "generic";

/** Hangi parse yolu kullanıldı. */
export type ParsePath = "rule" | "hybrid" | "llm" | "generic";

export type ClassificationResult = {
  readonly family: LayoutFamily;
  readonly confidence: number;
  readonly signals: readonly string[];
};

export type ParsedCharge = {
  readonly rawName: string;
  readonly amount: number;
  readonly vatRate: number | null;
};

export type ParseContext = {
  readonly vision: VisionResult;
  readonly tokens: readonly TokenizedLine[];
  readonly classification: ClassificationResult;
};

export type ParseResult = {
  readonly products: readonly ParsedProduct[];
  readonly charges: readonly ParsedCharge[];
  readonly blocks: readonly ProductBlock[];
  readonly footer: FooterData | null;
  readonly merchantOverride: string | null;
};

export type ReceiptParser = {
  readonly id: string;
  readonly family: LayoutFamily;
  readonly priority: number;
  score(ctx: ParseContext): number;
  parse(ctx: ParseContext): ParseResult;
};

export type CascadeParseOutcome = {
  readonly result: ParseResult;
  readonly parserId: string;
  readonly parsePath: ParsePath;
  readonly classification: ClassificationResult;
};
