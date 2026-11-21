/**
 * Simple in-memory fixed-window rate limiter. Works per server instance —
 * for multi-instance deployments swap this for Redis/Upstash.
 */
type Bucket = { count: number; reset: number };
const store = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = store.get(key);
  if (!b || b.reset < now) {
    store.set(key, { count: 1, reset: now + windowMs });
    if (store.size > 5000) for (const [k, v] of store) if (v.reset < now) store.delete(k);
    return { ok: true, remaining: limit - 1, reset: now + windowMs };
  }
  b.count += 1;
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count), reset: b.reset };
}

/**
 * Visitor IP behind a reverse proxy. X-Real-IP is set (overwritten) by nginx, so the
 * visitor cannot fake it. Failing that, use the LAST X-Forwarded-For entry: that is the
 * one our proxy appended. The first entry can be typed by the visitor, so it is not used.
 */
export function pickClientIp(realIp: string | null | undefined, forwardedFor: string | null | undefined) {
  const real = (realIp ?? '').trim();
  if (real) return real;
  const parts = (forwardedFor ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || 'unknown';
}

export function clientIp(headers: Headers) {
  return pickClientIp(headers.get('x-real-ip'), headers.get('x-forwarded-for'));
}
