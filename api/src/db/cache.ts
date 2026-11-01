import { Redis } from "ioredis";

/**
 * ─────────────────────────────────────────────────────────────
 * Caching with Redis
 * ─────────────────────────────────────────────────────────────
 * Implements distributed key-value caching with TTL expiration.
 * Used to cache:
 * - Query embeddings to eliminate repeated vector embedding API calls
 * - Retrieved document chunks for hot conversation contexts
 */

let redisClient: Redis | null = null;

try {
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    redisClient.connect().catch(() => {});
  }
} catch {
  redisClient = null;
}

export class RedisCacheManager {
  private inMemoryFallback = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    if (redisClient && redisClient.status === "ready") {
      try {
        return await redisClient.get(key);
      } catch {
        // Fail-safe fallback to in-memory store
      }
    }
    const item = this.inMemoryFallback.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.inMemoryFallback.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds: number = 300): Promise<void> {
    if (redisClient && redisClient.status === "ready") {
      try {
        await redisClient.set(key, value, "EX", ttlSeconds);
        return;
      } catch {
        // Fail-safe fallback to in-memory store
      }
    }
    this.inMemoryFallback.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (redisClient && redisClient.status === "ready") {
      try {
        await redisClient.del(key);
        return;
      } catch {}
    }
    this.inMemoryFallback.delete(key);
  }
}

export const cache = new RedisCacheManager();
