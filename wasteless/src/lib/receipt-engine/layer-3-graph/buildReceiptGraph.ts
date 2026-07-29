import type { LayoutDocument } from "../types/models/layout";
import type { ReceiptGraph } from "../types/models/graph";
import { finalizeGraph, initGraphState } from "./graphImmutable";
import { passAmountBinding } from "./passes/passAmountBinding";
import { passColumns } from "./passes/passColumns";
import { passContinuations } from "./passes/passContinuations";
import { passFooterOf } from "./passes/passFooterOf";
import { passNoise } from "./passes/passNoise";
import { passPrecedes } from "./passes/passPrecedes";
import { passRawLines } from "./passes/passRawLines";
import { passRegions } from "./passes/passRegions";
import { passTokens } from "./passes/passTokens";

export function buildReceiptGraph(layout: LayoutDocument): ReceiptGraph {
  let state = initGraphState(layout.profileId, layout.confidence);
  state = passRawLines(state, layout);
  state = passRegions(state, layout);
  state = passColumns(state, layout);
  state = passContinuations(state, layout);
  state = passTokens(state, layout);
  state = passAmountBinding(state, layout);
  state = passNoise(state, layout);
  state = passPrecedes(state, layout);
  state = passFooterOf(state, layout);
  return finalizeGraph(state);
}
