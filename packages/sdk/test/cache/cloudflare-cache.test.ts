/**
 * Tests for CloudflareCache
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CloudflareCache } from "../../src/cache/cloudflare-cache.js";

describe("CloudflareCache", () => {
  // Mock the global caches object
  let mockCache: any;

  beforeEach(() => {
    // Create mock cache storage
    const storage = new Map<string, Response>();

    mockCache = {
      match: vi.fn(async (requestOrUrl: Request | string) => {
        const url =
          typeof requestOrUrl === "string" ? requestOrUrl : requestOrUrl.url;
        return storage.get(url) || null;
      }),
      put: vi.fn(async (requestOrUrl: Request | string, response: Response) => {
        const url =
          typeof requestOrUrl === "string" ? requestOrUrl : requestOrUrl.url;
        storage.set(url, response.clone());
      }),
      delete: vi.fn(async (requestOrUrl: Request | string) => {
        const url =
          typeof requestOrUrl === "string" ? requestOrUrl : requestOrUrl.url;
        storage.delete(url);
        return true;
      }),
    };

    // Set up global caches object
    (globalThis as any).caches = {
      default: mockCache,
    };
  });

  it("should generate valid cache URLs", async () => {
    const cache = new CloudflareCache({
      baseUrl: "https://example.com",
      namespace: "test",
    });

    await cache.set("test-key", { data: "test" });

    expect(mockCache.put).toHaveBeenCalled();
    const call = mockCache.put.mock.calls[0];
    const cacheUrl = call[0] as string;
    expect(cacheUrl).toMatch(/^https:\/\/example\.com\/cache\/test\//);
  });

  it("should store and retrieve data", async () => {
    const cache = new CloudflareCache();
    const testData = { foo: "bar", count: 42 };

    await cache.set("test-key", testData);
    const result = await cache.get("test-key");

    expect(result).not.toBeNull();
    expect(result?.content).toEqual(testData);
  });

  it("should handle cache misses gracefully", async () => {
    const cache = new CloudflareCache();

    const result = await cache.get("non-existent-key");
    expect(result).toBeNull();
  });

  it("should respect TTL settings", async () => {
    const cache = new CloudflareCache({ ttl: 60 });

    await cache.set("test-key", "value", 30); // Override with 30 seconds

    expect(mockCache.put).toHaveBeenCalled();
    const call = mockCache.put.mock.calls[0];
    const response = call[1] as Response;

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=30");
  });

  it("should handle errors gracefully", async () => {
    const cache = new CloudflareCache();

    // Make match throw an error
    mockCache.match.mockRejectedValueOnce(new Error("Cache error"));

    const result = await cache.get("test-key");
    expect(result).toBeNull(); // Should return null on error
  });

  it("should validate expired entries", async () => {
    const cache = new CloudflareCache();

    // Create an expired response
    const expiredData = {
      metadata: {
        url: "test",
        fetchedAt: new Date(Date.now() - 7_200_000).toISOString(), // 2 hours ago
        expiresAt: new Date(Date.now() - 3_600_000).toISOString(), // 1 hour ago
      },
      content: "expired",
    };

    const expiredResponse = new Response(JSON.stringify(expiredData), {
      headers: {
        "Content-Type": "application/json",
      },
    });

    mockCache.match.mockResolvedValueOnce(expiredResponse);

    const result = await cache.get("test-key");
    expect(result).toBeNull();
    expect(mockCache.delete).toHaveBeenCalled();
  });

  it("should check existence correctly", async () => {
    const cache = new CloudflareCache();

    await cache.set("existing-key", "value");

    expect(await cache.has("existing-key")).toBe(true);
    expect(await cache.has("non-existent-key")).toBe(false);
  });

  it("should delete entries", async () => {
    const cache = new CloudflareCache();

    await cache.set("test-key", "value");
    await cache.delete("test-key");

    expect(mockCache.delete).toHaveBeenCalled();
  });

  it("should warn when clear is called", async () => {
    const cache = new CloudflareCache();
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    await cache.clear();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("CloudflareCache.clear() is not supported")
    );

    consoleWarnSpy.mockRestore();
  });
});
