import type { LayoutDocument } from "../types/layout-block";
import type { RawLine } from "../types/raw-line";
import { analyzeLayoutGeometric } from "./geometric-layout";
import {
  AMOUNT_ONLY,
  FUEL_LINE,
  FUEL_UNIT_PRICE,
} from "../semantic/patterns";

/**
 * Stage 2 entry — geometric grouping (bbox-aware, order-independent).
 */
export function analyzeLayout(lines: readonly RawLine[]): LayoutDocument {
  return analyzeLayoutGeometric(lines);
}

/** Legacy sequential grouping (text order). Benchmark / comparison only. */
export function analyzeLayoutSequential(lines: readonly RawLine[]): LayoutDocument {
  const blocks: import("../types/layout-block").LayoutBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const next = lines[i + 1];

    if (FUEL_LINE.test(line.text) || FUEL_UNIT_PRICE.test(line.text)) {
      const group: RawLine[] = [line];
      if (next && AMOUNT_ONLY.test(next.text)) {
        group.push(next);
        i += 2;
      } else {
        i += 1;
      }
      blocks.push(makeBlock(blocks.length, group));
      continue;
    }

    if (AMOUNT_ONLY.test(line.text) && next && (FUEL_LINE.test(next.text) || FUEL_UNIT_PRICE.test(next.text))) {
      blocks.push(makeBlock(blocks.length, [line, next]));
      i += 2;
      continue;
    }

    blocks.push(makeBlock(blocks.length, [line]));
    i += 1;
  }
  return { blocks, lineCount: lines.length };
}

function makeBlock(id: number, group: RawLine[]): import("../types/layout-block").LayoutBlock {
  return {
    id: `layout:${id}`,
    kind: group.length > 1 ? "line_group" : "single_line",
    lines: group,
    text: group.map((l) => l.text).join("\n"),
  };
}
