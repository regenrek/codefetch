/**
 * Tests for cache interface
 */

import { describe, it, expect } from "vitest";
import type {
  CacheInterface,
  CachedResult,
  CacheMetadata,
} from "../../src/cache/interface.js";

describe("Cache Interface", () => {
  // Helper to create a mock cache implementation for testing
  function createMockCache(): CacheInterface & {
    storage: Map<string, CachedResult>;
  } {
    const storage = new Map<string, CachedResult>();

    return {
      storage,

      async get(key: string): Promise<CachedResult | null> {
        const cached = storage.get(key);
        if (!cached) return null;

        // Check expiration
        if (cached.metadata?.expiresAt) {
          const expiresAt = new Date(cached.metadata.expiresAt);
          if (expiresAt <= new Date()) {
            storage.delete(key);
            return null;
          }
        }

        return cached;
      },

      async set(key: string, value: any, ttl = 3600): Promise<void> {
        const now = new Date();
        const effectiveTtl = ttl;
        const expiresAt = new Date(now.getTime() + effectiveTtl * 1000);

        const metadata: CacheMetadata = {
          url: key,
          fetchedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        };

        const cachedResult: CachedResult = {
          metadata,
          content: value,
          type: "memory",
        };

        storage.set(key, cachedResult);
      },

      async delete(key: string): Promise<void> {
        storage.delete(key);
      },

      async clear(): Promise<void> {
        storage.clear();
      },

      async has(key: string): Promise<boolean> {
        const cached = await this.get(key);
        return cached !== null;
      },
    };
  }

  it("should implement all required methods", () => {
    const cache = createMockCache();

    expect(cache.get).toBeDefined();
    expect(cache.set).toBeDefined();
    expect(cache.delete).toBeDefined();
    expect(cache.clear).toBeDefined();
    expect(cache.has).toBeDefined();
  });

  it("should store and retrieve values", async () => {
    const cache = createMockCache();
    const testData = { foo: "bar", count: 42 };

    await cache.set("test-key", testData);
    const result = await cache.get("test-key");

    expect(result).not.toBeNull();
    expect(result?.content).toEqual(testData);
    expect(result?.metadata.url).toBe("test-key");
  });

  it("should respect TTL", async () => {
    const cache = createMockCache();

    // Set with 1 second TTL
    await cache.set("test-key", "value", 1);

    // Should exist immediately
    expect(await cache.has("test-key")).toBe(true);

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Should be expired
    expect(await cache.has("test-key")).toBe(false);
    expect(await cache.get("test-key")).toBeNull();
  });

  it("should delete entries", async () => {
    const cache = createMockCache();

    await cache.set("test-key", "value");
    expect(await cache.has("test-key")).toBe(true);

    await cache.delete("test-key");
    expect(await cache.has("test-key")).toBe(false);
  });

  it("should clear all entries", async () => {
    const cache = createMockCache();

    await cache.set("key1", "value1");
    await cache.set("key2", "value2");
    await cache.set("key3", "value3");

    expect(cache.storage.size).toBe(3);

    await cache.clear();

    expect(cache.storage.size).toBe(0);
    expect(await cache.has("key1")).toBe(false);
    expect(await cache.has("key2")).toBe(false);
    expect(await cache.has("key3")).toBe(false);
  });
});
