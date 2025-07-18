/**
 * Enhanced cache integration for Cloudflare Workers
 * Supports both Cache API and KV namespaces
 */

import type { FetchResult } from "./types.js";
import { fetchFromWebWorker } from "./web/sdk-web-fetch-worker.js";
import type { FetchOptions } from "./fetch.js";
import { CacheError } from "./errors.js";

export interface CacheOptions {
  cacheKey?: string;
  ttl?: number; // seconds
  cacheBehavior?: "force-cache" | "no-cache" | "default";
  namespace?: string; // For KV namespace identification
}

export interface CacheStorage {
  type: "cache-api" | "kv";
  instance: Cache | KVNamespace;
}

/**
 * Fetch from web with caching support
 */
export async function fetchFromWebCached(
  source: string,
  options?: FetchOptions & { cache?: CacheOptions },
  cacheStorage?: CacheStorage
): Promise<FetchResult | string> {
  const cacheOptions = options?.cache;

  // If no cache or force no-cache, just fetch
  if (!cacheStorage || cacheOptions?.cacheBehavior === "no-cache") {
    return fetchFromWebWorker(source, options);
  }

  // Generate cache key
  const cacheKey = cacheOptions?.cacheKey || generateCacheKey(source, options);

  // Try to get from cache
  if (cacheOptions?.cacheBehavior !== "force-cache") {
    try {
      const cached = await getFromCache(cacheStorage, cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Log cache read error but continue with fetch
      console.warn("Cache read error:", error);
    }
  }

  // Fetch from source
  try {
    const result = await fetchFromWebWorker(source, options);

    // Store in cache
    if (cacheStorage) {
      try {
        await storeInCache(
          cacheStorage,
          cacheKey,
          result,
          cacheOptions?.ttl || 3600
        );
      } catch (error) {
        // Log cache write error but return result
        console.warn("Cache write error:", error);
      }
    }

    return result;
  } catch (error) {
    // If fetch fails and we have force-cache, try cache again
    if (cacheOptions?.cacheBehavior === "force-cache" && cacheStorage) {
      const cached = await getFromCache(cacheStorage, cacheKey);
      if (cached) {
        return cached;
      }
    }
    throw error;
  }
}

/**
 * Get data from cache (supports both Cache API and KV)
 */
async function getFromCache(
  cacheStorage: CacheStorage,
  key: string
): Promise<FetchResult | string | null> {
  if (cacheStorage.type === "cache-api") {
    const cache = cacheStorage.instance as Cache;
    const response = await cache.match(key);

    if (!response) return null;

    // Check if expired
    const expiresHeader = response.headers.get("expires");
    if (expiresHeader) {
      const expires = new Date(expiresHeader);
      if (expires < new Date()) {
        await cache.delete(key);
        return null;
      }
    }

    const contentType = response.headers.get("content-type");
    return contentType?.includes("application/json")
      ? response.json()
      : response.text();
  } else {
    // KV namespace
    const kv = cacheStorage.instance as KVNamespace;
    const data = await kv.get(key, "json");

    if (!data) return null;

    // Check if expired
    const metadata = await kv.getWithMetadata(key);
    if (metadata.metadata?.expires) {
      const expires = new Date(metadata.metadata.expires as string);
      if (expires < new Date()) {
        await kv.delete(key);
        return null;
      }
    }

    return data as FetchResult | string;
  }
}

/**
 * Store data in cache (supports both Cache API and KV)
 */
async function storeInCache(
  cacheStorage: CacheStorage,
  key: string,
  data: FetchResult | string,
  ttl: number
): Promise<void> {
  const expires = new Date(Date.now() + ttl * 1000);

  if (cacheStorage.type === "cache-api") {
    const cache = cacheStorage.instance as Cache;
    const headers = new Headers({
      "content-type":
        typeof data === "string" ? "text/plain" : "application/json",
      expires: expires.toUTCString(),
      "cache-control": `public, max-age=${ttl}`,
    });

    const response = new Response(
      typeof data === "string" ? data : JSON.stringify(data),
      { headers }
    );

    await cache.put(key, response);
  } else {
    // KV namespace
    const kv = cacheStorage.instance as KVNamespace;
    await kv.put(key, JSON.stringify(data), {
      expirationTtl: ttl,
      metadata: { expires: expires.toISOString() },
    });
  }
}

/**
 * Delete from cache
 */
export async function deleteFromCache(
  cacheStorage: CacheStorage,
  key: string
): Promise<boolean> {
  try {
    if (cacheStorage.type === "cache-api") {
      const cache = cacheStorage.instance as Cache;
      return cache.delete(key);
    } else {
      const kv = cacheStorage.instance as KVNamespace;
      await kv.delete(key);
      return true;
    }
  } catch (error) {
    throw new CacheError(
      `Failed to delete from cache: ${error}`,
      "delete",
      key
    );
  }
}

/**
 * Clear all cache entries matching a pattern
 */
export async function clearCache(
  cacheStorage: CacheStorage,
  pattern?: string
): Promise<number> {
  let cleared = 0;

  try {
    if (cacheStorage.type === "cache-api") {
      const cache = cacheStorage.instance as Cache;
      // Cache API doesn't support listing, so we can't clear by pattern
      // This would need to be tracked separately
      throw new Error("Pattern-based clearing not supported for Cache API");
    } else {
      const kv = cacheStorage.instance as KVNamespace;
      const list = await kv.list({ prefix: pattern });

      for (const key of list.keys) {
        await kv.delete(key.name);
        cleared++;
      }
    }

    return cleared;
  } catch (error) {
    throw new CacheError(`Failed to clear cache: ${error}`, "delete");
  }
}

/**
 * Generate a cache key from URL and options
 */
function generateCacheKey(url: string, options?: FetchOptions): string {
  const parts = [url];

  if (options) {
    // Add relevant options to cache key
    if (options.format) parts.push(`format:${options.format}`);
    if (options.maxTokens) parts.push(`tokens:${options.maxTokens}`);
    if (options.tokenEncoder) parts.push(`encoder:${options.tokenEncoder}`);
    if (options.extensions?.length) {
      parts.push(`ext:${options.extensions.sort().join(",")}`);
    }
    if (options.excludeDirs?.length) {
      parts.push(`exclude:${options.excludeDirs.sort().join(",")}`);
    }
  }

  // Create a hash of the key for shorter cache keys
  return `codefetch:${hashString(parts.join("|"))}`;
}

/**
 * Simple hash function for cache keys
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.codePointAt(i) || 0;
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Helper to create cache storage from Cloudflare bindings
 */
export function createCacheStorage(
  cacheOrKV: Cache | KVNamespace
): CacheStorage {
  // Check if it's a KV namespace (has get/put methods)
  if ("get" in cacheOrKV && "put" in cacheOrKV) {
    return {
      type: "kv",
      instance: cacheOrKV as KVNamespace,
    };
  }

  // Otherwise assume it's Cache API
  return {
    type: "cache-api",
    instance: cacheOrKV as Cache,
  };
}

/**
 * Decorator to add caching to any async function
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  getCacheKey: (...args: Parameters<T>) => string,
  ttl: number = 3600
): T {
  return (async (...args: Parameters<T>) => {
    const cacheKey = getCacheKey(...args);

    // Try to get from global cache if available
    if ((globalThis as any).caches) {
      const cache = await (globalThis as any).caches.open("codefetch");
      const cached = await cache.match(cacheKey);
      if (cached) {
        return cached.json();
      }
    }

    // Execute function
    const result = await fn(...args);

    // Store in cache
    if ((globalThis as any).caches) {
      const cache = await (globalThis as any).caches.open("codefetch");
      const response = new Response(JSON.stringify(result), {
        headers: {
          "content-type": "application/json",
          "cache-control": `public, max-age=${ttl}`,
        },
      });
      await cache.put(cacheKey, response);
    }

    return result;
  }) as T;
}
