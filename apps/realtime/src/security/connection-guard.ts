import { RATE_LIMITS } from '@whiteboard/shared';

import { env } from '../env';

/**
 * Connection-level security helpers (Guideline #9). Origin allow-listing plus a
 * cheap per-connection fixed-window rate limiter to blunt event floods. The
 * security session can move the limiter to a shared Redis backend for
 * multi-instance correctness.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    // Non-browser clients (and some proxies) omit Origin. Permit only in dev.
    return env.NODE_ENV !== 'production';
  }
  return env.REALTIME_ALLOWED_ORIGINS.includes(origin);
}

/** Per-connection fixed-window message limiter. */
export function createRateLimiter() {
  const { points, windowSeconds } = RATE_LIMITS.REALTIME_EVENTS;
  const windowMs = windowSeconds * 1000;
  let windowStart = Date.now();
  let count = 0;

  return function allow(): boolean {
    const now = Date.now();
    if (now - windowStart > windowMs) {
      windowStart = now;
      count = 0;
    }
    count += 1;
    return count <= points;
  };
}
