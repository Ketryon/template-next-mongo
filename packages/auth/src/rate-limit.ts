/**
 * A minimal fixed-window limiter for the code-request endpoint.
 *
 * provsvaret's `/api/auth/email/send` had reCAPTCHA and no rate limit.
 * reCAPTCHA is a bot signal, not a rate limit — it does nothing to stop a
 * single authenticated-looking client from requesting a thousand codes, so
 * mailbox-bombing an arbitrary address is free.
 *
 * In-memory, therefore per-instance: on serverless this bounds abuse per warm
 * instance rather than globally. That is a real limitation and the reason this
 * file is deliberately tiny — swap in Redis or Upstash when one instance is no
 * longer the whole story.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }

  entry.count += 1;

  if (entry.count > MAX_PER_WINDOW) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { ok: true, retryAfter: 0 };
}

/** Opportunistic cleanup so the map cannot grow without bound. */
export function sweepRateLimit(): void {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }
}
