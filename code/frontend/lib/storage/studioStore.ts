/**
 * On-device studio snapshots (IndexedDB — never leaves the browser).
 * Studios keep documents in memory, so any hard reload used to wipe them.
 * IndexedDB holds real File blobs via structured clone, so every studio —
 * text and binary alike — can be restored. All failures are silent by
 * design: memory state keeps working when storage is unavailable.
 */
const DB_NAME = "filezconverter";
const STORE_NAME = "studio-snapshots";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("indexeddb open failed"));
      req.onblocked = () => reject(new Error("indexeddb blocked"));
    } catch (err) {
      reject(err);
    }
  });
}

async function writeNow(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("indexeddb write failed"));
      tx.onabort = () => reject(tx.error ?? new Error("indexeddb write aborted"));
    });
  } finally {
    db.close();
  }
}

/** Load a studio snapshot. Null when absent or unreadable — never throws. */
export async function loadStudioSnapshot<T>(key: string): Promise<T | null> {
  try {
    if (typeof window === "undefined" || !("indexedDB" in window)) return null;
    const db = await openDb();
    try {
      const value = await new Promise<unknown>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error ?? new Error("indexeddb read failed"));
      });
      return value as T | null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Fire-and-forget snapshot save, debounced per key so rapid typing doesn't
 * stack transactions. Failures stay silent — memory state is unaffected.
 */
export function saveStudioSnapshot(key: string, value: unknown, delayMs = 500): void {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;
  const pending = saveTimers.get(key);
  if (pending) clearTimeout(pending);
  saveTimers.set(
    key,
    setTimeout(() => {
      saveTimers.delete(key);
      writeNow(key, value).catch(() => undefined);
    }, delayMs),
  );
}
