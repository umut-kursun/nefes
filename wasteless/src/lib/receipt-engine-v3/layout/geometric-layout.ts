import type { RawLine } from "../types/raw-line";
import type { LayoutBlock, LayoutDocument } from "../types/layout-block";
import { assignSyntheticBBoxes, bboxCenter, lineBounds, pageWidth } from "./geometry";
import { matchProductPairs, unpairedLines } from "./product-match";

/**
 * Stage 2 (geometric) — spatial row clustering + scored name/amount pairing.
 * Order-independent when bounding boxes reflect true layout.
 */
export function analyzeLayoutGeometric(lines: readonly RawLine[]): LayoutDocument {
  const enriched = assignSyntheticBBoxes(lines);
  const pageW = pageWidth(enriched);
  const pairs = matchProductPairs(enriched, pageW);
  const blocks: LayoutBlock[] = [];

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]!;
    const group =
      pair.name.index === pair.amount.index
        ? [pair.name]
        : [pair.name, pair.amount].sort((a, b) => a.index - b.index);
    blocks.push(makeBlock(i, group));
  }

  const leftover = unpairedLines(enriched, pairs);
  for (const line of leftover) {
    blocks.push(makeBlock(blocks.length, [line]));
  }

  blocks.sort((a, b) => {
    const ya = bboxCenter(lineBounds(a.lines[0]!)).y;
    const yb = bboxCenter(lineBounds(b.lines[0]!)).y;
    if (ya !== yb) return ya - yb;
    const xa = bboxCenter(lineBounds(a.lines[0]!)).x;
    const xb = bboxCenter(lineBounds(b.lines[0]!)).x;
    if (xa !== xb) return xa - xb;
    return a.lines[0]!.index - b.lines[0]!.index;
  });

  return { blocks, lineCount: lines.length };
}

function makeBlock(id: number, group: RawLine[]): LayoutBlock {
  return {
    id: `geo:${id}`,
    kind: group.length > 1 ? "line_group" : "single_line",
    lines: group,
    text: group.map((l) => l.text).join("\n"),
  };
}
