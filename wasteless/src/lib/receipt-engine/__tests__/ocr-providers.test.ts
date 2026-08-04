import { describe, expect, it, vi } from "vitest";
import { createMockOcrProvider } from "@/lib/receipt-engine/layer-1-ocr/providers/mockOcrProvider";
import { createOpenAiOcrProvider } from "@/lib/receipt-engine/layer-1-ocr/providers/openAiOcrProvider";
import {
  createOcrProvider,
  createOcrProviderFromEnv,
} from "@/lib/receipt-engine/layer-1-ocr/providers/providerFactory";
import { normalizeOcrExtractOutput } from "@/lib/receipt-engine/layer-1-ocr/normalizeOcrDocument";

describe("MockOcrProvider", () => {
  it("returns fixture text by key", async () => {
    const provider = createMockOcrProvider({
      fixtureLoader: (key) =>
        key === "supermarket/with-bag"
          ? { rawText: "MIGROS\nTOPLAM 10,00" }
          : null,
    });
    const result = await provider.extract({
      imageDataUrl: "ignored",
      fixtureKey: "supermarket/with-bag",
    });
    const doc = normalizeOcrExtractOutput(result);
    expect(doc.lines).toEqual(["MIGROS", "TOPLAM 10,00"]);
    expect(doc.source).toBe("mock");
  });
});

describe("OpenAIOcrProvider", () => {
  it("parses OCR JSON response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                rawText: "A101\nTOPLAM 8,90",
                lines: [
                  { text: "A101", confidence: 0.92 },
                  { text: "TOPLAM 8,90", confidence: 0.88 },
                ],
              }),
            },
          },
        ],
      }),
    });

    const provider = createOpenAiOcrProvider({
      apiKey: "test-key",
      fetchImpl: fetchImpl as typeof fetch,
    });

    const result = await provider.extract({
      imageDataUrl: "data:image/jpeg;base64,abc",
    });
    const rawContent = JSON.stringify({
      rawText: "A101\nTOPLAM 8,90",
      lines: [
        { text: "A101", confidence: 0.92 },
        { text: "TOPLAM 8,90", confidence: 0.88 },
      ],
    });
    expect(result.rawVisionResponse).toBe(rawContent);
    const doc = normalizeOcrExtractOutput(result);
    expect(doc.lines).toEqual(["A101", "TOPLAM 8,90"]);
    expect(doc.source).toBe("vision_primary");
    expect(doc.quality.score).toBeCloseTo(0.9, 1);
  });
});

describe("ProviderFactory", () => {
  it("creates mock provider by default", () => {
    const provider = createOcrProvider();
    expect(provider.kind).toBe("mock");
  });

  it("creates openai provider when api key supplied", () => {
    const provider = createOcrProvider({
      kind: "openai",
      openAi: { apiKey: "sk-test" },
    });
    expect(provider.kind).toBe("openai");
  });

  it("reads OpenAI key from env", () => {
    const provider = createOcrProviderFromEnv({
      OPENAI_API_KEY: "sk-env",
    } as NodeJS.ProcessEnv);
    expect(provider.kind).toBe("openai");
  });
});
