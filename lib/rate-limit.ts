/**
 * A small in-memory limiter for sign-in attempts (per server process). Enough to slow password
 * guessing on one server; a multi-server deployment would need a shared store.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function tooMany(key: string, limit: number, windowMs: number, now = Date.now()) {
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
