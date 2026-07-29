import { describe, expect, it } from "vitest";
import { emptyImageBundle } from "@/lib/receipt-engine/types/models/image";
import { layer1Ocr } from "@/lib/receipt-engine/layer-1-ocr/ocrExtractor.layer";
import { createMockOcrProvider } from "@/lib/receipt-engine/layer-1-ocr/providers/mockOcrProvider";
import {
  createEngineDependencies,
  resolveEngineConfig,
} from "@/lib/receipt-engine";
import { createStubLayoutProfileRegistry } from "@/lib/receipt-engine/config/profiles";
import { runPipelineFromOcr } from "@/lib/receipt-engine/pipeline/runPipelineFromOcr";
import {
  OCR_E2E_CATALOG,
  OCR_QUALITY_CATALOG,
  createOcrFixtureLoader,
  loadOcrFixtureText,
  ocrFixtureKey,
} from "@/lib/receipt-engine/fixtures/ocr/ocrFixtureRegistry";
import { loadFixturePurchase } from "@/lib/receipt-engine/fixtures/fixtureRegistry";

function testDeps() {
  const config = resolveEngineConfig({});
  return createEngineDependencies({
    config,
    layoutProfiles: createStubLayoutProfileRegistry(config.defaultLayoutProfileId),
    ocrProvider: createMockOcrProvider({
      fixtureLoader: createOcrFixtureLoader(),
    }),
  });
}

async function runOcrToPurchase(ref: (typeof OCR_E2E_CATALOG)[number]) {
  const deps = testDeps();
  const key = ocrFixtureKey(ref);
  const l1 = await layer1Ocr.run(
    {
      ...emptyImageBundle(`fixture://${key}`),
      meta: { fixtureKey: key },
    },
    { deps, config: deps.config }
  );
  expect(l1.issues).toEqual([]);
  return runPipelineFromOcr(l1.output, deps);
}

describe("OCR → PurchaseDraft end-to-end", () => {
  for (const ref of OCR_E2E_CATALOG) {
    it(`matches purchase golden for ${ref.category}/${ref.name}`, async () => {
      if (!ref.pipelineGolden) return;
      const actual = await runOcrToPurchase(ref);
      const expected = loadFixturePurchase(ref.pipelineGolden);
      expect(actual).toEqual(expected);
    });
  }
});

describe("OCR quality fixtures", () => {
  it("low-confidence fixture yields low OCR quality score", async () => {
    const ref = OCR_QUALITY_CATALOG.find(
      (r) => r.category === "low-confidence"
    )!;
    const deps = testDeps();
    const key = ocrFixtureKey(ref);
    const l1 = await layer1Ocr.run(
      {
        ...emptyImageBundle(`fixture://${key}`),
        meta: { fixtureKey: key },
      },
      { deps, config: deps.config }
    );
    expect(l1.output.quality.score).toBeLessThan(0.5);
    expect(l1.output.lineDetails?.every((l) => (l.confidence ?? 1) <= 0.5)).toBe(
      true
    );
  });

  it("blurred fixture still runs pipeline without throwing", async () => {
    const ref = OCR_QUALITY_CATALOG.find((r) => r.category === "blurred")!;
    const deps = testDeps();
    const key = ocrFixtureKey(ref);
    const l1 = await layer1Ocr.run(
      { ...emptyImageBundle(`fixture://${key}`), meta: { fixtureKey: key } },
      { deps, config: deps.config }
    );
    const purchase = runPipelineFromOcr(l1.output, deps);
    expect(purchase.products.length).toBeGreaterThanOrEqual(0);
    expect(loadOcrFixtureText(ref)).toContain("l5,00");
  });

  it("L1 output exposes source channel only, not provider implementation", async () => {
    const deps = testDeps();
    const key = ocrFixtureKey(OCR_E2E_CATALOG[0]!);
    const l1 = await layer1Ocr.run(
      {
        ...emptyImageBundle(`fixture://${key}`),
        meta: { fixtureKey: key },
      },
      { deps, config: deps.config }
    );
    const serialized = JSON.stringify(l1.output);
    expect(serialized).not.toContain("openai");
    expect(serialized).not.toContain('"kind"');
    expect(["mock", "vision_primary", "vision_alt", "fallback_text"]).toContain(
      l1.output.source
    );
  });
});

describe("OCR fixture categories", () => {
  it("lists pending fuel/restaurant/pharmacy placeholders", async () => {
    const { OCR_E2E_CATALOG: e2e } = await import(
      "@/lib/receipt-engine/fixtures/ocr/ocrFixtureRegistry"
    );
    const categories = new Set(e2e.map((r) => r.category));
    expect(categories.has("supermarket")).toBe(true);
    expect(categories.has("malformed")).toBe(true);
  });
});
