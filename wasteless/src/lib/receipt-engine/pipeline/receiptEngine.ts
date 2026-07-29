import type {
  EngineResult,
  ReceiptEngineInput,
} from "../types/pipeline";
import type { LayerContext } from "../types/layer";
import { LAYER_ORDER } from "../types/layer";
import type { EngineDependencies } from "./dependencies";
import { executeLayer } from "./executeLayer";
import { finalizeDebugTrace } from "./debugTrace";
import { createLayerContext } from "./layerContext";
import {
  createDefaultLayerStack,
  type LayerStack,
} from "./layerRegistry";

export interface ReceiptEngineOptions {
  deps: EngineDependencies;
  layers?: Partial<LayerStack>;
}

/**
 * Receipt Engine v2 orchestrator.
 * Infrastructure-only: layers return placeholders until Phase 2+.
 * Does not replace or invoke the v1 receipt pipeline.
 */
export class ReceiptEngine {
  private readonly deps: EngineDependencies;
  private readonly layers: LayerStack;

  constructor(options: ReceiptEngineOptions) {
    this.deps = options.deps;
    this.layers = {
      ...createDefaultLayerStack(),
      ...options.layers,
    };
  }

  getDependencies(): EngineDependencies {
    return this.deps;
  }

  async run(input: ReceiptEngineInput): Promise<EngineResult> {
    const ctx: LayerContext = createLayerContext(this.deps);

    try {
      const l0 = await executeLayer(this.layers.l0, input, ctx);
      const l1 = await executeLayer(this.layers.l1, l0.output, ctx);
      const l2 = await executeLayer(this.layers.l2, l1.output, ctx);
      const l3 = await executeLayer(this.layers.l3, l2.output, ctx);
      const l4 = await executeLayer(this.layers.l4, l3.output, ctx);
      const l5 = await executeLayer(this.layers.l5, l4.output, ctx);
      const l6 = await executeLayer(this.layers.l6, { blocks: l5.output }, ctx);
      const l7 = await executeLayer(this.layers.l7, l6.output, ctx);
      const l8 = await executeLayer(
        this.layers.l8,
        { purchase: l7.output.validatedPurchase, validation: l7.output },
        ctx
      );
      const l9 = await executeLayer(
        this.layers.l9,
        {
          purchase: l8.output,
          validation: l7.output,
          engineInput: input,
        },
        ctx
      );

      finalizeDebugTrace(ctx.trace);

      return {
        success: true,
        expense: l9.output,
        purchase: l8.output,
        validation: l7.output,
        debug: ctx.trace,
      };
    } catch (cause) {
      finalizeDebugTrace(ctx.trace);
      return {
        success: false,
        failure: {
          code: "INTERNAL_ERROR",
          message: "Receipt Engine v2 pipeline failed.",
          cause,
        },
        debug: ctx.trace,
      };
    }
  }

  /** Exposes canonical layer order for tests and tooling. */
  static layerOrder(): typeof LAYER_ORDER {
    return LAYER_ORDER;
  }
}

export async function runReceiptEngine(
  input: ReceiptEngineInput,
  deps: EngineDependencies
): Promise<EngineResult> {
  return new ReceiptEngine({ deps }).run(input);
}
