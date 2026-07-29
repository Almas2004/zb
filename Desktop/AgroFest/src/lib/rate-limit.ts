const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max = Number(process.env.RATE_LIMIT_MAX ?? 30), windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000)) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  if (current.count >= max) {
    return { ok: false, remaining: 0 };
  }
  current.count += 1;
  return { ok: true, remaining: max - current.count };
}
