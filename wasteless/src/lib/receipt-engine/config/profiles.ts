/** Layout profile registry — populated in Phase 2+. */
/** Optional confidence boost metadata — profiles never required for parsing. */
export interface ProfileConfidenceBoost {
  readonly profileId: string;
  readonly multiplier: number;
}

export interface LayoutProfile {
  id: string;
  label: string;
  detect: (rawText: string) => number;
}

export interface LayoutProfileRegistry {
  getDefaultId(): string;
  list(): LayoutProfile[];
  resolve(rawText: string): LayoutProfile;
}

export function createStubLayoutProfileRegistry(
  defaultId = "generic-tr"
): LayoutProfileRegistry {
  const generic: LayoutProfile = {
    id: defaultId,
    label: "Generic Turkish receipt",
    detect: () => 0.5,
  };

  return {
    getDefaultId: () => defaultId,
    list: () => [generic],
    resolve: () => generic,
  };
}
