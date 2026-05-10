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
  opts?: { staleOnError?: boolean }
): Promise<T> {
  const store = getStore<T>(ns);
  const hit = store.get(key);
  const now = Date.now();
  if (hit && hit.expiresAt > now) return hit.value;
  try {
    const value = await loader();
    store.set(key, { value, expiresAt: now + ttlMs });
    return value;
  } catch (err) {
    if (opts?.staleOnError && hit) return hit.value;
    throw err;
  }
}
