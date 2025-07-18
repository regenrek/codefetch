/**
 * Cloudflare Workers Cache implementation using the Cache API with valid URLs
 */

import {
  CacheInterface,
  CachedResult,
  CacheOptions,
  CacheMetadata,
} from "./interface.js";
import { createHash } from "../utils.js";

export class CloudflareCache implements CacheInterface {
  private options: CacheOptions;
  private cacheInstance: Cache;

  constructor(options: CacheOptions = {}) {
    this.options = {
      namespace: "codefetch",
      ttl: 3600, // 1 hour default
      baseUrl: "https://cache.codefetch.workers.dev", // Default base URL
      ...options,
    };

    // Get the default cache instance
    this.cacheInstance = (globalThis as any).caches?.default || caches.default;
  }

  /**
   * Generate a valid cache URL from a key
   */
  private getCacheUrl(key: string): string {
    // Ensure we have a valid base URL
    const baseUrl =
      this.options.baseUrl || "https://cache.codefetch.workers.dev";

    // Create a hash of the key for cleaner URLs
    const keyHash = createHash(key);

    // Build a valid URL with namespace and key
    return `${baseUrl}/cache/${this.options.namespace}/${encodeURIComponent(keyHash)}`;
  }

  async get(key: string): Promise<CachedResult | null> {
    try {
      const cacheUrl = this.getCacheUrl(key);
      const request = new Request(cacheUrl);

      const response = await this.cacheInstance.match(request);
      if (!response) {
        return null;
      }

      // Check if the response is still fresh
      const ageHeader = response.headers.get("age");
      const maxAge = this.options.ttl || 3600;

      if (ageHeader && Number.parseInt(ageHeader, 10) > maxAge) {
        // Cache is stale, delete it
        await this.delete(key);
        return null;
      }

      // Parse the cached data
      const data = (await response.json()) as CachedResult;

      // Validate expiration from metadata
      if (data.metadata?.expiresAt) {
        const expiresAt = new Date(data.metadata.expiresAt);
        if (expiresAt <= new Date()) {
          await this.delete(key);
          return null;
        }
      }

      return data;
    } catch (error) {
      console.warn("CloudflareCache.get failed:", error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const cacheUrl = this.getCacheUrl(key);
      const request = new Request(cacheUrl);

      const effectiveTtl = ttl || this.options.ttl || 3600;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + effectiveTtl * 1000);

      // Prepare the data with metadata
      const metadata: CacheMetadata = {
        url: key,
        fetchedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        contentType: "application/json",
      };

      const cachedResult: CachedResult = {
        metadata,
        content: value,
        type: "serialized",
      };

      // Create response with proper headers
      const response = new Response(JSON.stringify(cachedResult), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${effectiveTtl}`,
          Expires: expiresAt.toUTCString(),
        },
      });

      // Store in cache
      await this.cacheInstance.put(request, response);
    } catch (error) {
      console.warn("CloudflareCache.set failed:", error);
      // Fail silently - caching is not critical
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const cacheUrl = this.getCacheUrl(key);
      const request = new Request(cacheUrl);
      await this.cacheInstance.delete(request);
    } catch (error) {
      console.warn("CloudflareCache.delete failed:", error);
    }
  }

  async clear(): Promise<void> {
    // Note: Cloudflare Cache API doesn't support clearing all entries
    // This is a limitation we'll document
    console.warn(
      "CloudflareCache.clear() is not supported. Cache entries will expire based on TTL."
    );
  }

  async has(key: string): Promise<boolean> {
    try {
      const cacheUrl = this.getCacheUrl(key);
      const request = new Request(cacheUrl);
      const response = await this.cacheInstance.match(request);

      if (!response) {
        return false;
      }

      // Check if still valid
      const cached = await this.get(key);
      return cached !== null;
    } catch (error) {
      console.warn("CloudflareCache.has failed:", error);
      return false;
    }
  }
}
