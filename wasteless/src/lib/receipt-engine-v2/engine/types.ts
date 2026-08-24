import type { FooterData } from "../footer/FooterData";

import type { ParsedProduct } from "../parser/ParsedProduct";

import type { ProductBlock } from "../parser/ProductBlock";

import type { TokenizedLine } from "../tokenizer/TokenizedLine";

import type { VisionResult } from "../vision/types";

import type {

  ClassificationResult,

  ParsedCharge,

  ParsePath,

} from "../core/types";



export type PurchaseMerchant = {

  readonly rawName: string | null;

  readonly rawAddress: string | null;

  readonly rawTaxNumber: string | null;

};



export type PurchaseMetadata = {

  readonly purchaseDate: string | null;

  readonly purchaseTime: string | null;

  readonly receiptNumber: string | null;

  readonly currency: string | null;

};



export type PurchaseFuel = {
  readonly fuelType: string | null;
  readonly quantity: number | null;
  readonly unit: string | null;
  readonly unitPrice: number | null;
  readonly lineTotal: number | null;
  readonly plateNumber: string | null;
};

export type Purchase = {
  readonly merchant: PurchaseMerchant;
  readonly metadata: PurchaseMetadata;
  readonly products: readonly ParsedProduct[];
  readonly charges: readonly ParsedCharge[];
  readonly footer: FooterData;
  readonly fuel?: PurchaseFuel | null;
};



export type ReceiptEngineV2Result = {

  readonly purchase: Purchase;

  readonly rawVision: VisionResult;

  readonly tokens: readonly TokenizedLine[];

  readonly blocks: readonly ProductBlock[];

  readonly products: readonly ParsedProduct[];

  readonly charges: readonly ParsedCharge[];

  readonly footer: FooterData;

  readonly classification: ClassificationResult;

  readonly parserId: string;

  readonly parsePath: ParsePath;

  readonly receiptDocument: import("../extraction/types").ReceiptDocument;

};

