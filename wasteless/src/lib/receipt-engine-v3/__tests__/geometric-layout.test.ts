import { describe, expect, it } from "vitest";
import { rawLinesFromText } from "@/lib/receipt-engine-v3/ocr/from-text";
import { analyzeLayoutGeometric } from "@/lib/receipt-engine-v3/layout/geometric-layout";
import { analyzeLayoutSequential } from "@/lib/receipt-engine-v3/layout/analyze-layout";
import { assignSyntheticBBoxes, syntheticBBoxForLine } from "@/lib/receipt-engine-v3/layout/geometry";

describe("geometric layout", () => {
  it("pairs fuel detail with amount on adjacent row regardless of OCR order", () => {
    const text = `SHELL & TURCAS PETROL A.S.
2356,10 TL
Motorin 29,766 LT 79,17 TL/L
TOPLAM 2356,10`;
    const lines = rawLinesFromText(text).lines;
    const layout = analyzeLayoutGeometric(lines);
    const fuelBlock = layout.blocks.find((b) => /Motorin/i.test(b.text));
    expect(fuelBlock?.lines.length).toBeGreaterThanOrEqual(2);
    expect(fuelBlock?.text).toMatch(/2356,10/);
  });

  it("groups name and amount in same row by column split", () => {
    const text = "EKMEK 750 GR %1 15,00\nSUT 1 LT %1 45,90";
    const raw = rawLinesFromText(text).lines;
    const lines = raw.map((line) => ({
      ...line,
      bbox: {
        ...syntheticBBoxForLine(line),
        x: line.text.includes("15,00") || line.text.includes("45,90") ? 200 : 12,
      },
    }));
    const layout = analyzeLayoutGeometric(lines);
    expect(layout.blocks.length).toBe(2);
  });

  it("differs from sequential layout when lines are shuffled but bbox preserves layout", () => {
    const ordered = rawLinesFromText("Urun A 10,00\nUrun B 20,00").lines;
    const withBbox = assignSyntheticBBoxes(ordered).map((line, i) => ({
      ...line,
      index: i,
      bbox: {
        x: 12,
        y: i === 0 ? 100 : 40,
        w: 200,
        h: 28,
      },
    }));
    const shuffled = [withBbox[1]!, withBbox[0]!].map((l, i) => ({ ...l, index: i }));
    const geo = analyzeLayoutGeometric(shuffled);
    const seq = analyzeLayoutSequential(shuffled);
    expect(geo.blocks.length).toBe(2);
    expect(geo.blocks.map((b) => b.lines[0]!.bbox!.y)).toEqual([40, 100]);
    expect(seq.blocks.map((b) => b.lines[0]!.index)).toEqual([0, 1]);
  });
});

