import { CASCADE_THRESHOLDS, resolveParsePath } from "./cascadeConfig";

import type {

  CascadeParseOutcome,

  ParseContext,

  ParsePath,

  ReceiptParser,

} from "./types";

import { genericParser } from "../parsers/generic/GenericParser";

import { supermarketParser } from "../parsers/supermarket/SupermarketParser";

import { fuelParser } from "../parsers/fuel/FuelParser";

import { fastFoodParser } from "../parsers/fast_food/FastFoodParser";

import { restaurantParser } from "../parsers/restaurant/RestaurantParser";

import { retailParser } from "../parsers/retail/RetailParser";

import { sdkFallbackParser } from "../parsers/sdk-fallback/SdkFallbackParser";



const SPECIALIZED_PARSERS: readonly ReceiptParser[] = [

  supermarketParser,

  fuelParser,

  fastFoodParser,

  restaurantParser,

  retailParser,

];



const DEFAULT_PARSERS: readonly ReceiptParser[] = [

  ...SPECIALIZED_PARSERS,

  sdkFallbackParser,

  genericParser,

];



export type ParserRegistryOptions = {

  readonly parsers?: readonly ReceiptParser[];

};



function selectParser(ctx: ParseContext, parsers: readonly ReceiptParser[]): {

  parser: ReceiptParser;

  parsePath: ParsePath;

} {

  const ranked = parsers

    .filter((parser) => parser.id !== genericParser.id)

    .map((parser) => ({ parser, score: parser.score(ctx) }))

    .sort((a, b) => {

      if (b.score !== a.score) return b.score - a.score;

      return b.parser.priority - a.parser.priority;

    });



  const best = ranked[0];

  const classificationConfidence = ctx.classification.confidence;



  if (best && best.score >= CASCADE_THRESHOLDS.MIN_PARSER_SCORE) {

    const path = resolveParsePath(Math.max(best.score, classificationConfidence));



    if (best.parser.id === sdkFallbackParser.id) {

      return { parser: best.parser, parsePath: "llm" };

    }



    return { parser: best.parser, parsePath: path === "llm" ? "hybrid" : path };

  }



  if (classificationConfidence < 0.25) {
    return { parser: sdkFallbackParser, parsePath: "llm" };
  }

  return { parser: genericParser, parsePath: "generic" };

}



export function createParserRegistry(options: ParserRegistryOptions = {}) {

  const parsers = options.parsers ?? DEFAULT_PARSERS;



  return {

    parsers,



    classifyAndParse(ctx: ParseContext): CascadeParseOutcome {

      const { parser, parsePath } = selectParser(ctx, parsers);

      const result = parser.parse(ctx);



      return {

        result,

        parserId: parser.id,

        parsePath,

        classification: ctx.classification,

      };

    },

  };

}



export const defaultParserRegistry = createParserRegistry();


