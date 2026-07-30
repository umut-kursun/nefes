import type { ReceiptEnginePlugin, PluginKind } from "./types";

type PluginBucket = Map<string, ReceiptEnginePlugin>;

const buckets: Record<PluginKind, PluginBucket> = {
  merchant: new Map(),
  country: new Map(),
  ocrProvider: new Map(),
  currency: new Map(),
  normalization: new Map(),
  validation: new Map(),
  export: new Map(),
};

function bucketForKind(kind: PluginKind): PluginBucket {
  return buckets[kind];
}

export const PluginRegistry = {
  register(kind: PluginKind, plugin: ReceiptEnginePlugin): void {
    bucketForKind(kind).set(plugin.id, plugin);
  },

  get(kind: PluginKind, id: string): ReceiptEnginePlugin | undefined {
    return bucketForKind(kind).get(id);
  },

  getAll(kind: PluginKind): readonly ReceiptEnginePlugin[] {
    return Array.from(bucketForKind(kind).values());
  },

  clear(kind?: PluginKind): void {
    if (kind) {
      bucketForKind(kind).clear();
      return;
    }
    for (const key of Object.keys(buckets) as PluginKind[]) {
      buckets[key].clear();
    }
  },
};
