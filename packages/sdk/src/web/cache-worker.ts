/**
 * Cloudflare Worker-compatible cache implementation
 * Uses the Cache API instead of file system operations
 */

import type { ParsedURL } from "./url-handler.js";
import { extractCacheKey } from "./url-handler.js";

export interface CacheMetadata {
  url: string;
  fetchedAt: string;
  expiresAt: string;
  contentType?: string;
  headers?: Record<string, string>;
}

export interface CacheEntry {
  metadata: CacheMetadata;
  content: string;
}

/**
 * Worker-compatible cache implementation using Cache API
 */
export class WorkerWebCache {
  private ttlHours: number;
  private cachePrefix = "codefetch-v1";

  constructor(options?: { ttlHours?: number }) {
    this.ttlHours = options?.ttlHours ?? 1;
  }

  /**
   * Generate cache key for a parsed URL using Web Crypto API
   */
  private async getCacheKey(parsedUrl: ParsedURL): Promise<string> {
    const key = extractCacheKey(parsedUrl);

    // Use Web Crypto API for hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = [...new Uint8Array(hashBuffer)];
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const shortHash = hashHex.slice(0, 8);

    return `${this.cachePrefix}:${parsedUrl.type}:${key}-${shortHash}`;
  }

  /**
   * Initialize cache (no-op for Workers)
   */
  async init(): Promise<void> {
    // No initialization needed for Cache API
  }

  /**
   * Check if cache entry exists and is valid
   */
  async has(parsedUrl: ParsedURL): Promise<boolean> {
    const cache = await caches.open(this.cachePrefix);
    const cacheKey = await this.getCacheKey(parsedUrl);
    const response = await cache.match(cacheKey);

    if (!response) return false;

    // Check if expired by examining cache headers
    const expiresHeader = response.headers.get("expires");
    if (expiresHeader) {
      const expiresAt = new Date(expiresHeader);
      if (expiresAt <= new Date()) {
        await cache.delete(cacheKey);
        return false;
      }
    }

    return true;
  }

  /**
   * Get cached content
   */
  async get(parsedUrl: ParsedURL): Promise<CacheEntry | null> {
    const cache = await caches.open(this.cachePrefix);
    const cacheKey = await this.getCacheKey(parsedUrl);
    const response = await cache.match(cacheKey);

    if (!response) return null;

    // Check expiration
    const expiresHeader = response.headers.get("expires");
    if (expiresHeader) {
      const expiresAt = new Date(expiresHeader);
      if (expiresAt <= new Date()) {
        await cache.delete(cacheKey);
        return null;
      }
    }

    try {
      const data = (await response.json()) as CacheEntry;
      return data;
    } catch {
      await cache.delete(cacheKey);
      return null;
    }
  }

  /**
   * Store content in cache
   */
  async set(
    parsedUrl: ParsedURL,
    content: string | Buffer,
    options?: {
      contentType?: string;
      headers?: Record<string, string>;
    }
  ): Promise<void> {
    const cache = await caches.open(this.cachePrefix);
    const cacheKey = await this.getCacheKey(parsedUrl);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlHours * 60 * 60 * 1000);

    const metadata: CacheMetadata = {
      url: parsedUrl.url,
      fetchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      contentType: options?.contentType,
      headers: options?.headers,
    };

    const cacheEntry: CacheEntry = {
      metadata,
      content: content.toString(),
    };

    const response = new Response(JSON.stringify(cacheEntry), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${this.ttlHours * 3600}`,
        Expires: expiresAt.toUTCString(),
      },
    });

    await cache.put(cacheKey, response);
  }

  /**
   * Delete cache entry
   */
  async delete(parsedUrl: ParsedURL): Promise<void> {
    const cache = await caches.open(this.cachePrefix);
    const cacheKey = await this.getCacheKey(parsedUrl);
    await cache.delete(cacheKey);
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    // In Workers, we can't easily clear all entries
    // This would need to track keys or use a different approach
    console.warn("Cache clear not fully supported in Workers");
  }

  /**
   * Get cache statistics (limited in Workers)
   */
  async getStats(): Promise<{
    sizeMB: number;
    entryCount: number;
    websiteCount: number;
    repoCount: number;
  }> {
    // Workers don't provide cache size information
    return {
      sizeMB: 0,
      entryCount: 0,
      websiteCount: 0,
      repoCount: 0,
    };
  }
}
