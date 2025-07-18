/**
 * In-memory cache implementation for browser environments or as fallback
 */

import { CacheInterface, CachedResult, CacheOptions } from "./interface.js";

export class MemoryCache implements CacheInterface {
  private cache: Map<string, { data: CachedResult; expires: number }> =
    new Map();
  private options: CacheOptions;

  constructor(options: CacheOptions = {}) {
    this.options = {
      namespace: "codefetch",
      ttl: 3600, // 1 hour default
      maxSize: 50 * 1024 * 1024, // 50MB default for memory
      ...options,
    };
  }

  async get(key: string): Promise<CachedResult | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expires <= Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const effectiveTtl = ttl || this.options.ttl || 3600;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + effectiveTtl * 1000);

    const cachedResult: CachedResult = {
      metadata: {
        url: key,
        fetchedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        contentType: "application/json",
      },
      content: value,
      type: "memory",
    };

    this.cache.set(key, {
      data: cachedResult,
      expires: expiresAt.getTime(),
    });

    // Clean up expired entries periodically
    this.cleanupExpired();

    // Check memory usage and clean if needed
    this.cleanupIfNeeded();
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expires <= Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Estimate memory usage and clean if needed
   */
  private cleanupIfNeeded(): void {
    // This is a rough estimate - actual memory usage may vary
    const maxEntries = Math.floor(
      (this.options.maxSize || 50_000_000) / 10_240
    ); // Assume ~10KB per entry

    if (this.cache.size > maxEntries) {
      // Convert to array and sort by expiration time
      const entries = [...this.cache.entries()].sort(
        (a, b) => a[1].expires - b[1].expires
      );

      // Remove oldest entries until we're under the limit
      const entriesToRemove = Math.floor(entries.length * 0.2); // Remove 20%

      for (let i = 0; i < entriesToRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }
}
