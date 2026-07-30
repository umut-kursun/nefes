/**
 * Handles PWA file_handlers / launchQueue (Chrome, Edge).
 * When the OS opens an image with WasteLess, the file is queued for /add.
 */

type LaunchParams = {
  files: readonly FileSystemFileHandle[];
};

type LaunchQueue = {
  setConsumer: (consumer: (launchParams: LaunchParams) => void) => void;
};

let pendingFile: File | null = null;
const listeners = new Set<(file: File) => void>();

export function takePendingLaunchFile(): File | null {
  const file = pendingFile;
  pendingFile = null;
  return file;
}

export function onLaunchFile(handler: (file: File) => void): () => void {
  listeners.add(handler);
  if (pendingFile) handler(pendingFile);
  return () => listeners.delete(handler);
}

function notify(file: File) {
  pendingFile = file;
  listeners.forEach((listener) => listener(file));
}

/** Register OS "Open with WasteLess" / file_handlers consumer. Idempotent. */
export function registerLaunchQueueConsumer(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { launchQueue?: LaunchQueue };
  if (!w.launchQueue) return;

  w.launchQueue.setConsumer(async (params) => {
    const handle = params.files?.[0];
    if (!handle) return;
    try {
      const file = await handle.getFile();
      if (file.type.startsWith("image/")) notify(file);
    } catch {
      /* ignore unsupported handles */
    }
  });
}

/** Request persistent storage for Dexie (best-effort, no UI). */
export async function requestPersistentStorage(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
  try {
    const persisted = await navigator.storage.persisted();
    if (!persisted) await navigator.storage.persist();
  } catch {
    /* ignore */
  }
}
