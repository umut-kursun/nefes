import type { CatalogSnapshot } from "./catalogSnapshot";



/** Per-isolate memory cache for Worker catalog reads. */

let isolateCatalog: CatalogSnapshot | null = null;

let isolateVersion = -1;



export type CatalogLoadResult = {

  snapshot: CatalogSnapshot | null;

  /** Set when KV read failed and seed catalog fallback is used. */

  fallbackReason?: string;

};



export type LoadCanonicalCatalogOptions = {

  onFallback?: (reason: string) => void;

};



/**

 * Load canonical catalog from KV with isolate memory cache.

 * Reloads only when version changes or cache is cold.

 * On KV failure, returns null snapshot + fallbackReason (caller uses seed catalog).

 */

export async function loadCanonicalCatalog(

  fetchSnapshot: () => Promise<CatalogSnapshot | null>,

  options?: LoadCanonicalCatalogOptions

): Promise<CatalogLoadResult> {

  try {

    const snapshot = await fetchSnapshot();

    if (!snapshot || snapshot.version <= 0) {

      isolateCatalog = null;

      isolateVersion = -1;

      return { snapshot: null };

    }



    if (isolateCatalog && isolateVersion === snapshot.version) {

      return { snapshot: isolateCatalog };

    }



    isolateCatalog = snapshot;

    isolateVersion = snapshot.version;

    return { snapshot };

  } catch (error) {

    isolateCatalog = null;

    isolateVersion = -1;

    const reason =

      error instanceof Error ? error.message : "KV catalog read failed";

    options?.onFallback?.(reason);

    return { snapshot: null, fallbackReason: reason };

  }

}



/** Invalidate isolate cache after a publish on the same Worker. */

export function invalidateIsolateCatalogCache(): void {

  isolateCatalog = null;

  isolateVersion = -1;

}

