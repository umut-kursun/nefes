import { classifyLayout, defaultParserRegistry } from "../core";
import { extractReceiptDocument } from "../extraction/extractReceiptDocument";
import type { ReceiptDocument } from "../extraction/types";
import { tokenizeReceiptLinesFlat } from "../tokenizer/tokenizeReceiptLines";
import { readReceiptWithVisionOcr } from "../vision/openAiVisionOcrProvider";
import { applyNormalizedLines } from "../vision/normalizeVisionLines";
import type {
  OpenAiVisionOcrOptions,
  VisionOcrInput,
  VisionResult,
} from "../vision/types";
import { buildPurchase } from "./buildPurchase";
import type { ReceiptEngineV2Result } from "./types";
import type { ParsedProduct } from "../parser/ParsedProduct";

function isVisionResult(input: VisionOcrInput | VisionResult): input is VisionResult {
  return "rawText" in input && "lines" in input && !("imageDataUrl" in input);
}



function stripProductProvenance(
  products: ReceiptDocument["products"]
): readonly ParsedProduct[] {
  return products.map((product) => {
    const { provenance, ...rest } = product;
    void provenance;
    return rest;
  });
}



function runReceiptEngineV2Pipeline(rawVision: VisionResult): ReceiptEngineV2Result {

  const vision = applyNormalizedLines(rawVision);
  const tokens = tokenizeReceiptLinesFlat(vision.lines);

  const classification = classifyLayout(rawVision, tokens);



  const parseContext = {

    vision,

    tokens,

    classification,

  };



  const { result, parserId, parsePath } =

    defaultParserRegistry.classifyAndParse(parseContext);



  const receiptDocument = extractReceiptDocument(vision.lines);

  const products = stripProductProvenance(receiptDocument.products);

  const footer = receiptDocument.footer;

  const charges =

    receiptDocument.charges.length > 0 ? receiptDocument.charges : result.charges;



  const purchase = buildPurchase(vision, products, footer, {

    charges,

    merchantOverride: result.merchantOverride,

    fuel: receiptDocument.fuel,

  });



  return {

    purchase,

    rawVision: vision,

    tokens,

    blocks: result.blocks,

    products,

    charges,

    footer,

    classification,

    parserId,

    parsePath,

    receiptDocument,

  };

}



/** Run the full V2 pipeline from an existing OCR vision result. */

export function runReceiptEngineV2(vision: VisionResult): ReceiptEngineV2Result;



/** Run Vision OCR then the full V2 parsing pipeline. */

export function runReceiptEngineV2(

  input: VisionOcrInput,

  options: OpenAiVisionOcrOptions

): Promise<ReceiptEngineV2Result>;



export function runReceiptEngineV2(

  input: VisionResult | VisionOcrInput,

  options?: OpenAiVisionOcrOptions

): ReceiptEngineV2Result | Promise<ReceiptEngineV2Result> {

  if (isVisionResult(input)) {

    return runReceiptEngineV2Pipeline(input);

  }



  if (!options) {

    throw new Error("OpenAiVisionOcrOptions required when input is VisionOcrInput");

  }



  return readReceiptWithVisionOcr(input, options).then(({ result }) =>

    runReceiptEngineV2Pipeline(result)

  );

}



export { parseFooter } from "../footer/parseFooter";

