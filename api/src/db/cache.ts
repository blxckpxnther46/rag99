import { Redis } from "ioredis";
import env from "../config.js";

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
  if (env.REDIS_URL) {
    redisClient = new Redis(env.REDIS_URL, {
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
    if (redisClient) {
      try {
        return await redisClient.get(key);
      } catch {
        // Fall back to memory
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

  async set(key: string, value: string, ttlSeconds = 3600): Promise<void> {
    if (redisClient) {
      try {
        await redisClient.setex(key, ttlSeconds, value);
        return;
      } catch {
        // Fall back to memory
      }
    }
    this.inMemoryFallback.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (redisClient) {
      try {
        await redisClient.del(key);
      } catch {}
    }
    this.inMemoryFallback.delete(key);
  }
}

export const cache = new RedisCacheManager();
