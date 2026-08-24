import type { FooterData } from "../footer/FooterData";

import type { ParsedProduct } from "../parser/ParsedProduct";

import type { ParsedCharge } from "../core/types";

import type { VisionResult } from "../vision/types";

import type { Purchase } from "./types";



import type { ExtractedFuel } from "../extraction/types";

export type BuildPurchaseOptions = {
  readonly charges?: readonly ParsedCharge[];
  readonly merchantOverride?: string | null;
  readonly fuel?: ExtractedFuel | null;
};



/** Assemble a Purchase from vision, parsed products, and footer — no validation or inference. */

export function buildPurchase(

  vision: VisionResult,

  products: readonly ParsedProduct[],

  footer: FooterData,

  options: BuildPurchaseOptions = {}

): Purchase {

  const merchantName =

    options.merchantOverride?.trim() ||

    vision.merchant?.rawName?.trim() ||

    null;



  return {

    merchant: {

      rawName: merchantName,

      rawAddress: vision.merchant?.rawAddress ?? null,

      rawTaxNumber: vision.merchant?.rawTaxNumber ?? null,

    },

    metadata: {

      purchaseDate: vision.metadata?.purchaseDate ?? null,

      purchaseTime: vision.metadata?.purchaseTime ?? null,

      receiptNumber: vision.metadata?.receiptNumber ?? null,

      currency: vision.metadata?.currency ?? null,

    },

    products,

    charges: options.charges ?? [],

    footer,

    fuel: options.fuel
      ? {
          fuelType: options.fuel.fuelType,
          quantity: options.fuel.quantity,
          unit: options.fuel.unit,
          unitPrice: options.fuel.unitPrice,
          lineTotal: options.fuel.lineTotal,
          plateNumber: options.fuel.plateNumber,
        }
      : null,

  };

}

