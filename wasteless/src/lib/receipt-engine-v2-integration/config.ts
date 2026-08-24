/** Feature flag: enable Receipt Engine V2 in production scan flow. */
export function isReceiptEngineV2Enabled(): boolean {
  return process.env.USE_RECEIPT_ENGINE_V2 === "true";
}

export type ReceiptEngineVersion = "v1" | "v2";
