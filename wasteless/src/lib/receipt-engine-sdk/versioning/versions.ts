import { RECEIPT_ENGINE_VERSION } from "@/lib/receipt-engine/types/pipeline";

export const ENGINE_VERSION = RECEIPT_ENGINE_VERSION;
export const SCHEMA_VERSION = "1.0.0";
export const CORPUS_VERSION = "1.0.0";
export const GOLDEN_VERSION = "1.0.0";
export const REGRESSION_VERSION = "1.0.0";
export const PARSER_VERSION = "2.0.0";

export interface ReceiptEngineVersions {
  engine: string;
  schema: string;
  corpus: string;
  golden: string;
  regression: string;
  parser: string;
}

export function resolveVersionMetadata(): ReceiptEngineVersions {
  return {
    engine: ENGINE_VERSION,
    schema: SCHEMA_VERSION,
    corpus: CORPUS_VERSION,
    golden: GOLDEN_VERSION,
    regression: REGRESSION_VERSION,
    parser: PARSER_VERSION,
  };
}
