// Tiny per-isolate cache for COUNT(*) results.
//
// D1 bills every row a COUNT(*) scans as a row read, so repeated list calls on
// the users table were burning the free-tier daily quota. Counts are cached for
// a short TTL and dropped whenever this isolate performs a write.
//
// Trade-off: Workers may run several isolates, so a write handled by one
// isolate can leave another serving a count that is up to TTL_MS old.

const TTL_MS = 30_000;
const MAX_ENTRIES = 200;

const cache = new Map<string, { value: number; expires: number }>();

export async function cachedCount(
  key: string,
  compute: () => Promise<number>
): Promise<number> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value;

  const value = await compute();
  if (cache.size >= MAX_ENTRIES) cache.clear();
  cache.set(key, { value, expires: now + TTL_MS });
  return value;
}

/** Call after any insert/update/delete that can change a cached count. */
export function invalidateCounts(): void {
  cache.clear();
}
