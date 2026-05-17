type Entry<T> = { value: T; expiresAt: number };

const stores = new Map<string, Map<string, Entry<unknown>>>();

function getStore<T>(ns: string): Map<string, Entry<T>> {
  let s = stores.get(ns);
  if (!s) {
    s = new Map();
    stores.set(ns, s);
  }
  return s as Map<string, Entry<T>>;
}

export async function cached<T>(
  ns: string,
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  opts?: { staleOnError?: boolean; emptyTtlMs?: number }
): Promise<T> {
  const store = getStore<T>(ns);
  const hit = store.get(key);
  const now = Date.now();
  if (hit && hit.expiresAt > now) return hit.value;
  try {
    const value = await loader();
    const isEmpty = Array.isArray(value) && value.length === 0;
    const effectiveTtl = isEmpty && opts?.emptyTtlMs != null ? opts.emptyTtlMs : ttlMs;
    store.set(key, { value, expiresAt: now + effectiveTtl });
    return value;
  } catch (err) {
    if (opts?.staleOnError && hit) return hit.value;
    throw err;
  }
}

export function readFresh<T>(ns: string, key: string): T | undefined {
  const store = getStore<T>(ns);
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt > Date.now()) return hit.value;
  return undefined;
}

export function readStale<T>(ns: string, key: string): T | undefined {
  const store = getStore<T>(ns);
  return store.get(key)?.value;
}

export function write<T>(ns: string, key: string, value: T, ttlMs: number): void {
  const store = getStore<T>(ns);
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
