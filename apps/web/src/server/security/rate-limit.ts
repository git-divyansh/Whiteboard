import 'server-only';

import { AppError, RATE_LIMITS, type RateLimitKey, isAppError } from '@whiteboard/shared';

import { getRedis } from '@/server/redis';

/**
 * Fixed-window rate limiter (Guideline #17). A deliberately simple, working
 * baseline the security session can upgrade to a sliding-window / token-bucket
 * algorithm. Budgets live in @whiteboard/shared so they are auditable in one
 * place.
 *
 * Degradation policy: if Redis is unreachable we currently FAIL OPEN (log +
 * allow) to keep local dev productive. The security session must decide
 * fail-open vs. fail-closed per endpoint for production.
 */
export async function enforceRateLimit(key: RateLimitKey, identifier: string): Promise<void> {
  const config = RATE_LIMITS[key];
  const bucket = `rl:${key}:${identifier}`;

  try {
    const redis = getRedis();
    const count = await redis.incr(bucket);
    if (count === 1) {
      await redis.expire(bucket, config.windowSeconds);
    }
    if (count > config.points) {
      throw AppError.rateLimited();
    }
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }
    console.warn(`[rate-limit] backend unavailable for "${key}"; allowing request (fail-open).`);
  }
}
