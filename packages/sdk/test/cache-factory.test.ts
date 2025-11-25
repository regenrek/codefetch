import { describe, it, expect, afterEach, vi } from "vitest";
import { createCache, createCacheOfType } from "../src/cache/factory.js";
import { MemoryCache } from "../src/cache/memory-cache.js";

const originalCaches = (globalThis as any).caches;

describe("cache factory", () => {
  afterEach(() => {
    (globalThis as any).caches = originalCaches;
  });

  it("prefers Cloudflare cache when Cache API is available", async () => {
    const cacheApi = {
      match: vi.fn(async () => null),
      put: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
    };
    (globalThis as any).caches = { default: cacheApi };

    const cache = await createCache({ namespace: "cf-test" });
    expect(cache.constructor.name).toBe("CloudflareCache");
  });

  it("falls back to filesystem cache in Node environments", async () => {
    (globalThis as any).caches = undefined;
    const cache = await createCache({ namespace: "fs-test" });

    expect(cache.constructor.name).toBe("FileSystemCache");
    await cache.clear();
  });

  it("creates explicit cache types", async () => {
    const memoryCache = await createCacheOfType("memory");
    expect(memoryCache).toBeInstanceOf(MemoryCache);

    const fsCache = await createCacheOfType("filesystem");
    expect(fsCache.constructor.name).toBe("FileSystemCache");
    await fsCache.clear();
  });
});
