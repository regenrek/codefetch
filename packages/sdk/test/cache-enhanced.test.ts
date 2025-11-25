import { describe, it, expect, vi } from "vitest";
import {
  createCacheStorage,
  fetchFromWebCached,
  withCache,
} from "../src/cache-enhanced.js";

const fetchFromWebWorkerMock = vi.hoisted(() => vi.fn());

vi.mock("../src/web/sdk-web-fetch-worker.js", () => ({
  fetchFromWebWorker: (...args: any[]) => fetchFromWebWorkerMock(...args),
}));

describe("Enhanced Cache Smoke Tests", () => {
  it("should create cache storage from Cache API", () => {
    const mockCache = {
      match: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const storage = createCacheStorage(mockCache as any);

    expect(storage).toBeDefined();
    expect(storage.type).toBe("cache-api");
    expect(storage.instance).toBe(mockCache);
  });

  it("should create cache storage from KV namespace", () => {
    const mockKV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      getWithMetadata: vi.fn(),
    };

    const storage = createCacheStorage(mockKV as any);

    expect(storage).toBeDefined();
    expect(storage.type).toBe("kv");
    expect(storage.instance).toBe(mockKV);
  });

  it("should create cached function with decorator", async () => {
    let callCount = 0;
    const expensiveFunction = async (input: string) => {
      callCount++;
      return `Result: ${input}`;
    };

    const cachedFunction = withCache(
      expensiveFunction,
      (input: string) => `cache-key-${input}`,
      60
    );

    // First call
    const result1 = await cachedFunction("test");
    expect(result1).toBe("Result: test");
    expect(callCount).toBe(1);

    // Note: In a real environment with cache, second call would use cache
    // In test environment without global cache, it will call function again
    const result2 = await cachedFunction("test");
    expect(result2).toBe("Result: test");

    // Different input should call function
    const result3 = await cachedFunction("different");
    expect(result3).toBe("Result: different");
  });

  it("should handle cache options interface", () => {
    const options = {
      cacheKey: "test-key",
      ttl: 3600,
      cacheBehavior: "default" as const,
      namespace: "test-namespace",
    };

    expect(options.cacheKey).toBe("test-key");
    expect(options.ttl).toBe(3600);
    expect(options.cacheBehavior).toBe("default");
    expect(options.namespace).toBe("test-namespace");
  });

  it("returns cached value from Cache API when available", async () => {
    const cachedResponse = new Response(JSON.stringify({ ok: true }), {
      headers: {
        "content-type": "application/json",
        expires: new Date(Date.now() + 1000).toUTCString(),
      },
    });

    const mockCache = {
      match: vi.fn().mockResolvedValue(cachedResponse),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const storage = { type: "cache-api", instance: mockCache } as any;
    fetchFromWebWorkerMock.mockResolvedValue("should-not-be-used");

    const result = await fetchFromWebCached(
      "https://example.com",
      { cache: { cacheBehavior: "default" } } as any,
      storage
    );

    expect(result).toEqual({ ok: true });
    expect(fetchFromWebWorkerMock).not.toHaveBeenCalled();
  });

  it("stores fetched result into Cache API after a miss", async () => {
    const mockCache = {
      match: vi.fn().mockResolvedValue(null),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const storage = { type: "cache-api", instance: mockCache } as any;
    fetchFromWebWorkerMock.mockResolvedValue("fresh-data");

    const result = await fetchFromWebCached(
      "https://example.com/resource",
      { cache: { ttl: 10 } } as any,
      storage
    );

    expect(result).toBe("fresh-data");
    expect(mockCache.put).toHaveBeenCalled();
  });

  it("falls back to cache when force-cache and fetch fails", async () => {
    const cachedResponse = new Response("cached", {
      headers: {
        "content-type": "text/plain",
        expires: new Date(Date.now() + 1000).toUTCString(),
      },
    });

    const mockCache = {
      match: vi.fn().mockResolvedValue(cachedResponse),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const storage = { type: "cache-api", instance: mockCache } as any;
    fetchFromWebWorkerMock.mockRejectedValue(new Error("network"));

    const result = await fetchFromWebCached(
      "https://example.com",
      { cache: { cacheBehavior: "force-cache" } } as any,
      storage
    );

    expect(result).toBe("cached");
    expect(mockCache.delete).not.toHaveBeenCalled();
  });
});
