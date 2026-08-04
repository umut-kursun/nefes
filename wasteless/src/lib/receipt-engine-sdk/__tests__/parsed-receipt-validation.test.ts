import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  finalizeParsedReceipt,
  parseParsedReceiptJson,
  type ParsedReceipt,
} from "../types/ParsedReceipt";
import {
  roundLineTotal,
  postProcessParsedReceipt,
} from "../vision/parsedReceiptPostProcess";
import {
  buildVisionRetryInstruction,
  validateParsedReceiptLineItems,
  validateParsedReceiptMath,
} from "../vision/parsedReceiptValidation";
import { parseReceiptWithVisionRetry } from "../vision/visionParseWithRetry";

vi.mock("../vision/openAiVisionParseProvider", () => ({
  parseReceiptWithVision: vi.fn(),
}));

import { parseReceiptWithVision } from "../vision/openAiVisionParseProvider";

const fixturePath = join(
  process.cwd(),
  "fixtures/vision/file-market-e-arsiv.json"
);

function loadFileMarketFixture(): ParsedReceipt {
  return finalizeParsedReceipt(
    parseParsedReceiptJson(JSON.parse(readFileSync(fixturePath, "utf8")))
  );
}

/** BAGET read as 76 TL with 2×37.50 — classic line-shift / misread. */
function shiftedBagetFixture(): ParsedReceipt {
  const full = parseParsedReceiptJson(
    JSON.parse(readFileSync(fixturePath, "utf8"))
  );
  return {
    ...full,
    products: full.products.map((p) =>
      /BAGET/i.test(p.name)
        ? { ...p, quantity: 2, unitPrice: 37.5, lineTotal: 76 }
        : p
    ),
  };
}

function incompleteFileMarketFixture(): ParsedReceipt {
  const full = loadFileMarketFixture();
  return {
    ...full,
    products: full.products.filter(
      (p) => !/KARPUZ|NEKTARIN/i.test(p.name)
    ),
  };
}

function wrapVision(parsed: ParsedReceipt, rawVisionResponse = '{"mock":true}') {
  return { parsed, rawVisionResponse };
}

describe("roundLineTotal", () => {
  it("fixes float truncation for weighted produce", () => {
    expect(roundLineTotal(0.744, 89.9)).toBe(66.89);
    expect(roundLineTotal(0.798, 99.9)).toBe(79.72);
    expect(roundLineTotal(6.607, 16.5)).toBe(109.02);
    expect(roundLineTotal(2, 37.5)).toBe(75);
  });
});

describe("postProcessParsedReceipt", () => {
  it("auto-corrects truncated NEKTARIN lineTotal from qty × unitPrice", () => {
    const raw = parseParsedReceiptJson(
      JSON.parse(readFileSync(fixturePath, "utf8"))
    );
    const broken = postProcessParsedReceipt({
      ...raw,
      products: raw.products.map((p) =>
        /NEKTARIN/i.test(p.name) ? { ...p, lineTotal: 66.8 } : p
      ),
    });
    const fixed = broken.products.find((p) => /NEKTARIN/i.test(p.name))!;
    expect(fixed.lineTotal).toBe(66.89);
  });

  it("preserves receipt KARPUZ lineTotal when within rounding tolerance", () => {
    const raw = parseParsedReceiptJson(
      JSON.parse(readFileSync(fixturePath, "utf8"))
    );
    const processed = postProcessParsedReceipt(raw);
    const karpuz = processed.products.find((p) => /KARPUZ/i.test(p.name))!;
    expect(karpuz.lineTotal).toBe(109.01);
  });
});

describe("validateParsedReceiptLineItems", () => {
  it("passes with zero line shifts on FİLE MARKET fixture", () => {
    const parsed = loadFileMarketFixture();
    const checks = validateParsedReceiptLineItems(parsed);
    expect(checks.every((c) => c.ok)).toBe(true);
    expect(checks.find((c) => /BAGET/i.test(c.name))?.expectedLineTotal).toBe(
      75
    );
    expect(checks.find((c) => /NEKTARIN/i.test(c.name))?.expectedLineTotal).toBe(
      66.89
    );
  });

  it("detects SADE BAGET lineTotal mismatch (76 vs 2×37.50=75)", () => {
    const parsed = shiftedBagetFixture();
    const checks = validateParsedReceiptLineItems(parsed);
    const baget = checks.find((c) => /BAGET/i.test(c.name));
    expect(baget?.ok).toBe(false);
    expect(baget?.expectedLineTotal).toBe(75);
    expect(baget?.actualLineTotal).toBe(76);
  });
});

describe("validateParsedReceiptMath", () => {
  it("passes on FİLE MARKET fixture totaling 817.02 TL", () => {
    const parsed = loadFileMarketFixture();
    const math = validateParsedReceiptMath(parsed);
    expect(math.ok).toBe(true);
    expect(math.itemSum).toBe(817.02);
    expect(math.total).toBe(817.02);
    expect(math.delta).toBe(0);
  });

  it("fails on incomplete extraction missing weighted produce", () => {
    const parsed = incompleteFileMarketFixture();
    const math = validateParsedReceiptMath(parsed);
    expect(math.ok).toBe(false);
    expect(math.total).toBe(817.02);
    expect(math.itemSum).toBeLessThan(817.02);
    expect(math.delta).toBeGreaterThan(0.5);
  });
});

describe("buildVisionRetryInstruction", () => {
  it("mentions shifted multiplier and spatial realignment", () => {
    const parsed = shiftedBagetFixture();
    const lineChecks = validateParsedReceiptLineItems(parsed);
    const math = validateParsedReceiptMath(finalizeParsedReceipt(parsed));
    const instruction = buildVisionRetryInstruction(
      math.itemSum,
      math.total,
      lineChecks
    );
    expect(instruction).toMatch(/817\.02/);
    expect(instruction).toMatch(/SHIFTED A MULTIPLIER/i);
    expect(instruction).toMatch(/BAGET|SADE/i);
    expect(instruction).toMatch(/PATTERN A|PATTERN B/i);
    expect(instruction).toMatch(/66\.89|75\.00/);
  });
});

describe("parseReceiptWithVisionRetry", () => {
  const mockParse = vi.mocked(parseReceiptWithVision);

  beforeEach(() => {
    mockParse.mockReset();
  });

  it("retries once when line totals mismatch receipt total", async () => {
    const incomplete = incompleteFileMarketFixture();
    const complete = loadFileMarketFixture();

    mockParse
      .mockResolvedValueOnce(wrapVision(incomplete, '{"attempt":1}'))
      .mockResolvedValueOnce(wrapVision(complete, '{"attempt":2}'));

    const result = await parseReceiptWithVisionRetry(
      { imageDataUrl: "data:image/png;base64,abc" },
      { apiKey: "test-key", maxRetries: 1 }
    );

    expect(mockParse).toHaveBeenCalledTimes(2);
    expect(result.retried).toBe(true);
    expect(result.math.ok).toBe(true);
    expect(result.math.itemSum).toBe(817.02);
    expect(result.rawVisionResponse).toBe('{"attempt":2}');
    expect(mockParse.mock.calls[1]?.[1]?.retryInstruction).toMatch(
      /SHIFTED A MULTIPLIER|YOU HAVE SHIFTED/i
    );
  });

  it("retries on line-item math errors (shifted BAGET)", async () => {
    const shifted = shiftedBagetFixture();
    const completeRaw = parseParsedReceiptJson(
      JSON.parse(readFileSync(fixturePath, "utf8"))
    );

    mockParse
      .mockResolvedValueOnce(wrapVision(shifted))
      .mockResolvedValueOnce(wrapVision(completeRaw));

    const result = await parseReceiptWithVisionRetry(
      { imageDataUrl: "data:image/png;base64,abc" },
      { apiKey: "test-key", maxRetries: 1 }
    );

    expect(mockParse).toHaveBeenCalledTimes(2);
    expect(result.retried).toBe(true);
    expect(result.lineChecks.every((c) => c.ok)).toBe(true);
    expect(result.math.itemSum).toBe(817.02);
  });

  it("does not retry when math already matches", async () => {
    const completeRaw = parseParsedReceiptJson(
      JSON.parse(readFileSync(fixturePath, "utf8"))
    );
    mockParse.mockResolvedValueOnce(wrapVision(completeRaw));

    const result = await parseReceiptWithVisionRetry(
      { imageDataUrl: "data:image/png;base64,abc" },
      { apiKey: "test-key", maxRetries: 1 }
    );

    expect(mockParse).toHaveBeenCalledTimes(1);
    expect(result.retried).toBe(false);
    expect(result.math.ok).toBe(true);
  });
});
