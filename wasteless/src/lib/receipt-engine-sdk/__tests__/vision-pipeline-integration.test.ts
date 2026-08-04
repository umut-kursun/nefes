import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { orchestrateFromImage } from "../orchestratePipeline";
import { resolveSdkConfig } from "../config/SdkEngineConfig";
import {
  finalizeParsedReceipt,
  parseParsedReceiptJson,
} from "../types/ParsedReceipt";
import { OKC_VISION_PARSE_PROMPT } from "../vision/okcVisionPrompt";

vi.mock("../vision/visionParseWithRetry", () => ({
  parseReceiptWithVisionRetry: vi.fn(),
}));

import { parseReceiptWithVisionRetry } from "../vision/visionParseWithRetry";

const fixturePath = join(
  process.cwd(),
  "fixtures/vision/file-market-e-arsiv.json"
);

function loadFixtureRaw() {
  return parseParsedReceiptJson(
    JSON.parse(readFileSync(fixturePath, "utf8"))
  );
}

describe("direct vision pipeline (orchestrateFromImage)", () => {
  const mockVisionRetry = vi.mocked(parseReceiptWithVisionRetry);

  beforeEach(() => {
    mockVisionRetry.mockReset();
  });

  it("uses vision-first path when image and API key are present", async () => {
    const parsed = finalizeParsedReceipt(loadFixtureRaw());
    mockVisionRetry.mockResolvedValueOnce({
      parsed,
      rawVisionResponse: readFileSync(fixturePath, "utf8"),
      retried: false,
      math: { ok: true, itemSum: 817.02, total: 817.02, delta: 0 },
      lineChecks: [],
    });

    const config = resolveSdkConfig({ parserMode: "vision_first" });
    const result = await orchestrateFromImage(
      {
        imagePrimary: { dataUrl: "data:image/jpeg;base64,abc", variant: "enhanced" },
        sourceHint: "test-receipt",
        imageDataUrl: "data:image/jpeg;base64,abc",
      },
      config,
      { kind: "openai", openAi: { apiKey: "test-key", model: "gpt-4o-mini" } }
    );

    expect(mockVisionRetry).toHaveBeenCalledTimes(1);
    expect(result.purchase.products.length).toBe(10);
    expect(result.purchase.total?.amount).toBe(817.02);
    expect(result.validation.consistent).toBe(true);
    expect(result.performance.ocrMs).toBeGreaterThanOrEqual(0);
    expect(result.rawVisionResponse).toBe(readFileSync(fixturePath, "utf8"));
  });

  it("throws when vision fails in vision_first mode (no OCR fallback)", async () => {
    mockVisionRetry.mockRejectedValueOnce(new Error("Vision API unavailable"));

    const config = resolveSdkConfig({
      parserMode: "vision_first",
      ocrProviderId: "mock",
    });

    await expect(
      orchestrateFromImage(
        {
          imagePrimary: { dataUrl: "data:image/jpeg;base64,abc", variant: "enhanced" },
          sourceHint: "fallback-test",
          imageDataUrl: "data:image/jpeg;base64,abc",
        },
        config,
        { kind: "openai", openAi: { apiKey: "test-key" } }
      )
    ).rejects.toThrow(/vision_first parse failed: Vision API unavailable/);
  });

  it("throws when vision_first mode lacks API key (no legacy fallback)", async () => {
    const config = resolveSdkConfig({ parserMode: "vision_first" });

    await expect(
      orchestrateFromImage(
        {
          imagePrimary: { dataUrl: "data:image/jpeg;base64,abc", variant: "enhanced" },
          sourceHint: "no-key-test",
          imageDataUrl: "data:image/jpeg;base64,abc",
        },
        config,
        undefined
      )
    ).rejects.toThrow(/Legacy OCR\/classifier pipeline.*disabled/);
  });

  it("skips vision path when parserMode is not vision_first", async () => {
    const config = resolveSdkConfig({ parserMode: "ocr_then_deterministic", ocrProviderId: "mock" });
    await orchestrateFromImage(
      {
        imagePrimary: { dataUrl: "data:image/jpeg;base64,abc", variant: "enhanced" },
        sourceHint: "ocr-mode-test",
        imageDataUrl: "data:image/jpeg;base64,abc",
      },
      config,
      { kind: "openai", openAi: { apiKey: "test-key" } }
    );

    expect(mockVisionRetry).not.toHaveBeenCalled();
  });

  it("sets validation consistent=false when totals mismatch after finalize", async () => {
    const incomplete = finalizeParsedReceipt({
      ...loadFixtureRaw(),
      products: loadFixtureRaw().products.filter(
        (p) => !/KARPUZ|NEKTARIN/i.test(p.name)
      ),
    });
    mockVisionRetry.mockResolvedValueOnce({
      parsed: incomplete,
      rawVisionResponse: "{}",
      retried: false,
      math: {
        ok: false,
        itemSum: incomplete.products.reduce((s, p) => s + p.lineTotal, 0),
        total: incomplete.financials.totalAmount,
        delta: 100,
      },
      lineChecks: [],
    });

    const config = resolveSdkConfig({ parserMode: "vision_first" });
    const result = await orchestrateFromImage(
      {
        imagePrimary: { dataUrl: "data:image/jpeg;base64,abc", variant: "enhanced" },
        sourceHint: "mismatch-test",
        imageDataUrl: "data:image/jpeg;base64,abc",
      },
      config,
      { kind: "openai", openAi: { apiKey: "test-key" } }
    );

    expect(result.validation.consistent).toBe(false);
    expect(
      result.validation.errors.some((e) => e.code === "TOTAL_MISMATCH")
    ).toBe(true);
  });
});

describe("OKC_VISION_PARSE_PROMPT", () => {
  it("includes deterministic quantity and VAT rules", () => {
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/prefer missing values over hallucinated/i);
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/quantity = null/i);
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/TATLI %10 \*625,00/);
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/%10 is VAT, NOT quantity/);
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/NEVER infer quantity/i);
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/9 AD x 40,00 TL\/AD/);
  });

  it("includes discounts, charges, and accounting total", () => {
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/discounts\[\]/);
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/charges\[\]/);
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/amount = -57\.49/);
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/KARGO/);
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/POŞET/);
    expect(OKC_VISION_PARSE_PROMPT).toMatch(
      /sum\(products\.lineTotal\) \+ sum\(charges\.amount\) - sum\(abs\(discounts\.amount\)\)/
    );
  });

  it("includes spatial multiplier patterns and rawText rules", () => {
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/PATTERN A/);
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/PATTERN B/);
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/DO NOT skip any lines/i);
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/3 AD x 25,90/i);
    expect(OKC_VISION_PARSE_PROMPT).toMatch(/\*-57,49/);
  });
});

describe("finalizeParsedReceipt mathConsistent", () => {
  it("flags mathConsistent=false without mutating line totals", () => {
    const raw = loadFixtureRaw();
    const incomplete = finalizeParsedReceipt({
      ...raw,
      products: raw.products.filter((p) => !/KARPUZ|NEKTARIN/i.test(p.name)),
    });
    expect(incomplete.mathConsistent).toBe(false);
    const karpuzMissing = incomplete.products.every(
      (p) => !/KARPUZ/i.test(p.name)
    );
    expect(karpuzMissing).toBe(true);
  });

  it("flags mathConsistent=true on complete fixture", () => {
    const finalized = finalizeParsedReceipt(loadFixtureRaw());
    expect(finalized.mathConsistent).toBe(true);
  });
});
