import { readFileSync } from "node:fs";

import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runReceiptEngineV2 } from "../../engine/runReceiptEngineV2";

import { parseVisionResult } from "../../vision/parseVisionResult";



function loadMigros644() {

  const fixturePath = join(

    process.cwd(),

    "fixtures/vision/ocr-golden/migros-644-ocr.json"

  );

  const data = JSON.parse(readFileSync(fixturePath, "utf8")) as {

    rawText: string;

    merchant: { title: string };

    metadata: {

      purchaseDate: string;

      purchaseTime: string;

      receiptNumber: string;

      currency: string;

    };

  };

  const lines = data.rawText.split(/\r?\n/).filter((line) => line.length > 0);

  const vision = parseVisionResult({

    rawText: data.rawText,

    lines,

    merchant: { rawName: data.merchant.title },

    metadata: data.metadata,

  });

  return runReceiptEngineV2(vision);

}



describe("migros-644 stage trace", () => {

  it("routes through supermarket parser with interleaved qty binding", () => {

    const result = loadMigros644();



    expect(result.parserId).toBe("supermarket-v1");

    expect(result.classification.family).toBe("supermarket");



    expect(result.blocks[0]).toEqual({

      productLine: "SALATA ATOM ADET  %1  *42,95",

      quantityLine: null,

      discountLines: [],

    });



    const hiyarBlock = result.blocks.find((block) =>

      block.productLine.includes("HIYAR BADEM")

    );

    expect(hiyarBlock?.quantityLine).toBe("0.900 KG x 59,95 TL/KG");



    const hiyar = result.products.find((product) =>

      product.rawName.includes("HIYAR BADEM")

    );

    expect(hiyar?.lineTotal).toBeCloseTo(53.96, 2);

  });

});

