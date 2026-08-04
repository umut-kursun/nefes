import type { LayoutRegion } from "../types/models/layout";

import { isAddressLikeLine, isFuelLine, TOPKDV_HINT } from "../patterns/document";

import {

  matchesDate,

  matchesReceiptNumber,

  matchesTime,

} from "../patterns/neutral";

import { BARCODE_NOISE, FOOTER_HINT, HAS_LETTERS, SEPARATOR_NOISE, VAT_STANDALONE } from "./patterns";

import { isAmountOnlyLine, isSplitProductAmountLine } from "./lineUtils";



function isNonProductContinuationLine(text: string): boolean {

  if (isAddressLikeLine(text)) return true;

  if (TOPKDV_HINT.test(text)) return true;

  if (matchesDate(text) || matchesTime(text) || matchesReceiptNumber(text)) return true;

  if (isSplitProductAmountLine(text)) return true;

  return false;

}



const FUEL_NAME = /motor[iİI]n|benzin|dizel|lpg|euro/i;

const FUEL_VAT_STAR = /^[xX×]\s*\d{1,2}\s*\*/;



export function markContinuations(

  lines: string[],

  regions: LayoutRegion[],

  trailingAmounts: Array<number | null>

): boolean[] {

  return lines.map((line, index) => {

    if (regions[index] !== "body") return false;

    if (isFuelLine(line)) return false;



    const prevText = index > 0 ? (lines[index - 1] ?? "") : "";

    const isFuelVatStarLine = FUEL_VAT_STAR.test(line.trim());

    const prevIsFuelName =

      index > 0 && regions[index - 1] === "body" && FUEL_NAME.test(prevText);



    // Fuel VAT+total after product name (×20 *2.767,98) — before trailingAmount guard

    if (prevIsFuelName && isFuelVatStarLine) {

      return true;

    }



    // Modifier line followed by priced product (e.g. TOMBİK → DÖNER 150 GR *395)

    if (

      trailingAmounts[index] != null &&

      index > 0 &&

      regions[index - 1] === "body" &&

      trailingAmounts[index - 1] == null &&

      HAS_LETTERS.test(line) &&

      (lines[index - 1]?.length ?? 0) < 32 &&

      !isNonProductContinuationLine(lines[index - 1] ?? "") &&

      index >= 2 &&

      trailingAmounts[index - 2] != null

    ) {

      return true;

    }



    // Fuel product name after quantity/unit-price row (e.g. MOTORİN after 29,766 LİK 79,17)

    if (

      index > 0 &&

      (isFuelLine(prevText) || /(\d+,\d{3})\s*L[Iİiı]K\b/i.test(prevText)) &&

      HAS_LETTERS.test(line) &&

      !isFuelLine(line)

    ) {

      return true;

    }



    if (trailingAmounts[index] != null) return false;

    if (isAmountOnlyLine(line)) return false;

    if (isNonProductContinuationLine(line)) return false;

    if (VAT_STANDALONE.test(line)) return false;

    if (BARCODE_NOISE.test(line.replace(/\s/g, ""))) return false;

    if (SEPARATOR_NOISE.test(line)) return false;

    if (!HAS_LETTERS.test(line)) return false;



    const nextHasAmount =

      index + 1 < lines.length &&

      regions[index + 1] === "body" &&

      trailingAmounts[index + 1] != null;

    const nextHasSplitAmount =

      nextHasAmount && isSplitProductAmountLine(lines[index + 1] ?? "");

    const nextLine = index + 1 < lines.length ? (lines[index + 1] ?? "") : "";

    const nextIsAmountOnly =

      index + 1 < lines.length &&

      isAmountOnlyLine(nextLine) &&

      (regions[index + 1] === "body" ||

        (regions[index + 1] === "footer" && !FOOTER_HINT.test(nextLine)));

    const prevOpen =

      index > 0 &&

      regions[index - 1] === "body" &&

      trailingAmounts[index - 1] == null &&

      !isNonProductContinuationLine(prevText);

    const prevIsFuelQty = index > 0 && regions[index - 1] === "body" && isFuelLine(prevText);

    const prevIsSplitAmount = index > 0 && isSplitProductAmountLine(prevText);



    if (nextIsAmountOnly && HAS_LETTERS.test(line) && !isNonProductContinuationLine(line)) {

      return true;

    }

    if (prevOpen && nextHasSplitAmount) return true;

    if (prevIsFuelQty && HAS_LETTERS.test(line) && !isNonProductContinuationLine(line)) {

      return true;

    }

    if (prevOpen && nextHasAmount) return true;

    if (

      line.length < 48 &&

      index > 0 &&

      (trailingAmounts[index - 1] == null ||

        isFuelLine(prevText) ||

        nextIsAmountOnly) &&

      !isNonProductContinuationLine(line) &&

      !prevIsSplitAmount &&

      !isNonProductContinuationLine(prevText)

    ) {

      return true;

    }

    return false;

  });

}

