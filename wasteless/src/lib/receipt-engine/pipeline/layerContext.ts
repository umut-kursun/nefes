import type { LayerContext } from "../types/layer";
import type { EngineDependencies } from "./dependencies";
import { createDebugTrace } from "./debugTrace";

export function createLayerContext(deps: EngineDependencies): LayerContext {
  return {
    engineVersion: deps.config.engineVersion,
    debug: deps.config.debug,
    trace: createDebugTrace(),
    deps,
  };
}
