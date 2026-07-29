import type { LayerContext, LayerResult, ReceiptEngineLayer } from "../types/layer";
import { recordLayerSnapshot } from "./debugTrace";

export async function executeLayer<TIn, TOut>(
  layer: ReceiptEngineLayer<TIn, TOut>,
  input: TIn,
  ctx: LayerContext
): Promise<LayerResult<TOut>> {
  const started = Date.now();
  const result = await layer.run(input, ctx);
  const durationMs = Date.now() - started;

  if (ctx.debug) {
    recordLayerSnapshot(ctx.trace, {
      layerId: layer.id,
      durationMs,
      issues: result.issues,
      output: result.output,
    });
  } else {
    recordLayerSnapshot(ctx.trace, {
      layerId: layer.id,
      durationMs,
      issues: result.issues,
      output: { _redacted: true, layerId: layer.id },
    });
  }

  result.metrics.durationMs = durationMs;
  return result;
}
