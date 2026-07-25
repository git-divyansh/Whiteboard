import 'server-only';

import Redis from 'ioredis';

import { env } from '@/env';

/**
 * Redis client singleton (cache / pub-sub / rate-limit backend). Cached on
 * globalThis to survive dev hot-reload. Configured to fail fast when the backend
 * is unavailable so callers (e.g. the rate limiter) can degrade gracefully
 * instead of hanging.
 */
const globalForRedis = globalThis as unknown as { redis?: Redis };

export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    const client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    client.on('error', (error) => {
      // Never throw here — surfaced to the caller at command time.
      console.error('[redis] connection error:', error.message);
    });
    globalForRedis.redis = client;
  }
  return globalForRedis.redis;
}
