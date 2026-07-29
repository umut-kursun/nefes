import { describe, expect, it } from "vitest";
import {
  ReceiptEngine,
  runReceiptEngine,
  createEngineDependencies,
  resolveEngineConfig,
  LAYER_ORDER,
  getLayerExecutionOrder,
  createDefaultLayerStack,
  emptyImageBundle,
  type LayerStack,
  type ReceiptEngineLayer,
  createLayerStubIssue,
  createLayerMetrics,
  CONFIDENCE,
} from "@/lib/receipt-engine";
import type { ReceiptEngineInput } from "@/lib/receipt-engine";
import { createStubLayoutProfileRegistry } from "@/lib/receipt-engine/config/profiles";

function testInput(): ReceiptEngineInput {
  return {
    imagePrimary: {
      dataUrl: "data:image/jpeg;base64,abc",
      width: 100,
      height: 200,
      preprocessMs: 12,
    },
    sourceHint: "receipt",
  };
}

function testDeps(debug = false) {
  const config = resolveEngineConfig({ debug });
  return createEngineDependencies({
    config,
    layoutProfiles: createStubLayoutProfileRegistry(config.defaultLayoutProfileId),
  });
}

function stubLayer<TIn, TOut>(
  id: (typeof LAYER_ORDER)[number],
  output: TOut
): ReceiptEngineLayer<TIn, TOut> {
  return {
    id,
    run: async (input, ctx) => {
      void input;
      void ctx;
      return {
      output,
      issues: [createLayerStubIssue(id)],
      metrics: createLayerMetrics(0, CONFIDENCE.none),
      };
    },
  };
}

describe("Receipt Engine v2 foundation", () => {
  it("defines canonical layer order L0 through L9", () => {
    expect(LAYER_ORDER).toEqual([
      "L0_IMAGE",
      "L1_OCR",
      "L2_LAYOUT",
      "L3_GRAPH",
      "L4_CLASSIFY",
      "L5_BLOCKS",
      "L6_PURCHASE",
      "L7_VALIDATE",
      "L8_KNOWLEDGE",
      "L9_EXPENSE",
    ]);
    expect(ReceiptEngine.layerOrder()).toBe(LAYER_ORDER);
  });

  it("executes default stub layers in order", async () => {
    const result = await runReceiptEngine(testInput(), testDeps());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(getLayerExecutionOrder(result.debug)).toEqual([...LAYER_ORDER]);
    expect(result.expense.id).toBe("stub-exp-v2");
    expect(result.purchase.products).toEqual([]);
    expect(result.validation.score).toBeGreaterThanOrEqual(0);
  });

  it("records full debug snapshots when debug=true", async () => {
    const result = await runReceiptEngine(testInput(), testDeps(true));
    expect(result.success).toBe(true);
    if (!result.success) return;

    const snapshot = result.debug.snapshots.find((s) => s.layerId === "L0_IMAGE");
    expect(snapshot).toBeDefined();
    expect(snapshot!.output).toMatchObject({
      primary: expect.objectContaining({
        dataUrl: "data:image/jpeg;base64,abc",
      }),
    });
    expect(result.debug.finishedAt).toBeDefined();
  });

  it("redacts snapshot payloads when debug=false", async () => {
    const result = await runReceiptEngine(testInput(), testDeps(false));
    expect(result.success).toBe(true);
    if (!result.success) return;

    const snapshot = result.debug.snapshots[0];
    expect(snapshot?.output).toEqual({
      _redacted: true,
      layerId: "L0_IMAGE",
    });
  });

  it("supports dependency injection via ReceiptEngine constructor", async () => {
    const customProfileId = "test-profile";
    const deps = createEngineDependencies({
      config: resolveEngineConfig({
        defaultLayoutProfileId: customProfileId,
      }),
      layoutProfiles: createStubLayoutProfileRegistry(customProfileId),
    });

    const engine = new ReceiptEngine({ deps });
    expect(engine.getDependencies().config.defaultLayoutProfileId).toBe(
      customProfileId
    );

    const result = await engine.run({
      ...testInput(),
    });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(deps.config.defaultLayoutProfileId).toBe(customProfileId);
  });

  it("allows replacing individual layers in the stack", async () => {
    const order: string[] = [];

    function trackingLayer<TIn, TOut>(
      id: (typeof LAYER_ORDER)[number],
      output: TOut
    ): ReceiptEngineLayer<TIn, TOut> {
      return {
        id,
        run: async (input, ctx) => {
          order.push(id);
          return stubLayer<TIn, TOut>(id, output).run(input, ctx);
        },
      };
    }

    const base = createDefaultLayerStack();
    const customStack: LayerStack = {
      l0: trackingLayer(
        "L0_IMAGE",
        emptyImageBundle(testInput().imagePrimary.dataUrl)
      ),
      l1: base.l1,
      l2: base.l2,
      l3: base.l3,
      l4: base.l4,
      l5: base.l5,
      l6: base.l6,
      l7: base.l7,
      l8: base.l8,
      l9: base.l9,
    };

    const engine = new ReceiptEngine({
      deps: testDeps(),
      layers: customStack,
    });

    await engine.run(testInput());
    expect(order[0]).toBe("L0_IMAGE");
    expect(order.length).toBe(1);
  });

  it("marks unimplemented stub layers with LAYER_NOT_IMPLEMENTED issues", async () => {
    const result = await runReceiptEngine(testInput(), testDeps());
    expect(result.success).toBe(true);
    if (!result.success) return;

    const implementedLayers = new Set([
      "L1_OCR",
      "L2_LAYOUT",
      "L3_GRAPH",
      "L4_CLASSIFY",
      "L5_BLOCKS",
      "L6_PURCHASE",
      "L7_VALIDATE",
    ]);
    for (const layerId of LAYER_ORDER) {
      const snapshot = result.debug.snapshots.find((s) => s.layerId === layerId);
      const isStub = !implementedLayers.has(layerId);
      expect(snapshot?.issues.some((i) => i.code === "LAYER_NOT_IMPLEMENTED")).toBe(
        isStub
      );
    }
  });

  it("default layer stack contains ten layers", () => {
    const stack = createDefaultLayerStack();
    expect(Object.keys(stack)).toHaveLength(10);
  });
});

describe("ReceiptGraph model", () => {
  it("exports graph types with empty factory", async () => {
    const { emptyReceiptGraph } = await import("@/lib/receipt-engine");
    const graph = emptyReceiptGraph("generic-tr");
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
    expect(graph.profileId).toBe("generic-tr");
  });
});
