import { describe, expect, it } from "vitest";
import { runReceiptPipelineV3 } from "@/lib/receipt-engine-v3";
import { loadGoldenFixture } from "@/lib/receipt-engine-v3/fixtures/golden/loader";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function corruptOcr(text: string, mode: string): string {
  const lines = text.split(/\r?\n/).filter(Boolean);
  switch (mode) {
    case "swap":
      if (lines.length >= 4) [lines[2], lines[3]] = [lines[3]!, lines[2]!];
      return lines.join("\n");
    case "drop":
      return lines.filter((_, i) => i % 5 !== 3).join("\n");
    case "duplicate":
      return [...lines.slice(0, 3), lines[2]!, ...lines.slice(3)].join("\n");
    case "split-word":
      return lines
        .map((l) => l.replace(/(\w{4,})/, (m) => `${m.slice(0, 2)} ${m.slice(2)}`))
        .join("\n");
    case "merge-word":
      return lines.map((l) => l.replace(/(\w)\s+(\w)/g, "$1$2")).join("\n");
    case "shuffle":
      return shuffle(lines).join("\n");
    default:
      return text;
  }
}

const MODES = ["swap", "drop", "duplicate", "split-word", "merge-word", "shuffle"] as const;

describe("receipt-engine-v3 OCR disorder resilience", () => {
  const migros = loadGoldenFixture("migros");
  const shell = loadGoldenFixture("shell");

  it.each(MODES)("Migros survives %s corruption", (mode) => {
    const corrupted = corruptOcr(migros.ocrText, mode);
    const { purchase } = runReceiptPipelineV3(corrupted);
    expect(purchase.merchant).toMatch(/MIGROS/i);
    expect(purchase.total?.amount).toBeCloseTo(61.4, 1);
    expect(purchase.products.some((p) => /TOPLAM|TOPKDV/i.test(p.name))).toBe(false);
  });

  it("Shell fuel survives amount-before-detail swap", () => {
    const swapped = shell.ocrText
      .split(/\r?\n/)
      .filter(Boolean)
      .reverse()
      .join("\n");
    const { purchase } = runReceiptPipelineV3(swapped);
    expect(purchase.products[0]?.lineTotal).toBeCloseTo(2356.1, 1);
    expect(purchase.products[0]?.quantity).toBeCloseTo(29.766, 1);
  });
});
