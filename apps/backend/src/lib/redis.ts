import Redis from 'ioredis';

/**
 * Redis client (ioredis).
 * Used for caching search results, rate limiting, and session data.
 */

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  // Retry strategy: exponential backoff up to 30 seconds
  retryStrategy(times) {
    const delay = Math.min(times * 100, 30_000);
    return delay;
  },
  // Don't crash the process on connection failure
  lazyConnect: true,
  enableOfflineQueue: false,
});

redis.on('connect', () => {
  console.log('[redis] Connected');
});

redis.on('error', (err) => {
  console.error('[redis] Connection error:', err.message);
});

export default redis;
