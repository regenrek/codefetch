import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rm, writeFile } from "node:fs/promises";
import { WebCache, parseURL } from "@codefetch/sdk";

describe("WebCache", () => {
  let cache: WebCache;
  let testCacheDir: string;

  beforeEach(async () => {
    testCacheDir = join(tmpdir(), `codefetch-test-cache-${Date.now()}`);
    cache = new WebCache({
      cacheDir: testCacheDir,
      ttlHours: 1,
      maxSizeMB: 10,
    });
    await cache.init();
  });

  afterEach(async () => {
    await rm(testCacheDir, { recursive: true, force: true });
  });

  describe("Cache Operations", () => {
    it("should initialize cache directories", async () => {
      const stats = await cache.getStats();
      expect(stats.entryCount).toBe(0);
      expect(stats.websiteCount).toBe(0);
      expect(stats.repoCount).toBe(0);
    });

    it("should cache website content", async () => {
      const url = parseURL("https://example.com/docs");
      await cache.set(url!, "test-content", {
        contentType: "text/html",
        headers: { "content-type": "text/html" },
      });

      expect(await cache.has(url!)).toBe(true);
      const entry = await cache.get(url!);
      expect(entry).toBeTruthy();
      expect(entry?.metadata.url).toBe("https://example.com/docs");
      expect(entry?.metadata.contentType).toBe("text/html");
    });

    it("should cache git repository paths", async () => {
      const url = parseURL("https://github.com/user/repo");
      const repoPath = "/tmp/test-repo";
      await cache.set(url!, repoPath);

      expect(await cache.has(url!)).toBe(true);
      const entry = await cache.get(url!);
      expect(entry?.content).toBe(repoPath);
    });

    it("should respect TTL expiration", async () => {
      // Create cache with very short TTL
      const shortCache = new WebCache({
        cacheDir: testCacheDir,
        ttlHours: 0.0001, // ~0.36 seconds
        maxSizeMB: 10,
      });

      const url = parseURL("https://example.com");
      await shortCache.set(url!, "content");

      // Should exist immediately
      expect(await shortCache.has(url!)).toBe(true);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should be expired
      expect(await shortCache.has(url!)).toBe(false);
      expect(await shortCache.get(url!)).toBe(null);
    });

    it("should delete cache entries", async () => {
      const url = parseURL("https://example.com");
      await cache.set(url!, "content");

      expect(await cache.has(url!)).toBe(true);
      await cache.delete(url!);
      expect(await cache.has(url!)).toBe(false);
    });

    it("should clear entire cache", async () => {
      const url1 = parseURL("https://example.com");
      const url2 = parseURL("https://github.com/user/repo");

      await cache.set(url1!, "content1");
      await cache.set(url2!, "content2");

      let stats = await cache.getStats();
      expect(stats.entryCount).toBe(2);

      await cache.clear();

      stats = await cache.getStats();
      expect(stats.entryCount).toBe(0);
    });
  });

  describe("Cache Key Generation", () => {
    it("should generate unique keys for different URLs", async () => {
      const url1 = parseURL("https://example.com/page1");
      const url2 = parseURL("https://example.com/page2");

      await cache.set(url1!, "content1");
      await cache.set(url2!, "content2");

      const entry1 = await cache.get(url1!);
      const entry2 = await cache.get(url2!);

      expect(entry1?.content).not.toBe(entry2?.content);
    });

    it("should handle git repository URLs with branches", async () => {
      const mainUrl = parseURL("https://github.com/user/repo");
      const branchUrl = parseURL("https://github.com/user/repo/tree/develop");

      await cache.set(mainUrl!, "/tmp/repo-main");
      await cache.set(branchUrl!, "/tmp/repo-develop");

      const mainEntry = await cache.get(mainUrl!);
      const branchEntry = await cache.get(branchUrl!);

      expect(mainEntry?.content).toBe("/tmp/repo-main");
      expect(branchEntry?.content).toBe("/tmp/repo-develop");
    });
  });

  describe("Cache Size Management", () => {
    it("should track cache size", async () => {
      const url = parseURL("https://example.com");
      await cache.set(url!, "some content here");

      const stats = await cache.getStats();
      expect(stats.sizeMB).toBeGreaterThan(0);
      expect(stats.entryCount).toBe(1);
    });

    it("should track cache size", async () => {
      // This is a simpler test that just verifies size tracking works
      const url1 = parseURL("https://example.com/page1");
      const url2 = parseURL("https://example.com/page2");

      await cache.set(url1!, "x".repeat(1000));
      await cache.set(url2!, "y".repeat(2000));

      const stats = await cache.getStats();
      expect(stats.sizeMB).toBeGreaterThan(0);
      expect(stats.entryCount).toBe(2);
      expect(stats.websiteCount).toBe(2);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing cache entries gracefully", async () => {
      const url = parseURL("https://nonexistent.com");
      expect(await cache.has(url!)).toBe(false);
      expect(await cache.get(url!)).toBe(null);
    });

    it("should handle corrupted metadata gracefully", async () => {
      const url = parseURL("https://example.com");
      await cache.set(url!, "content");

      // Get the actual cache directory for this URL
      // The cache module uses md5 hash, so we need to get it directly
      const cacheStats = await cache.getStats();
      expect(cacheStats.websiteCount).toBe(1);

      // Corrupt the metadata by writing invalid JSON to the cache directory
      const websitesDir = join(testCacheDir, "websites");
      const dirs = await import("node:fs/promises").then((fs) =>
        fs.readdir(websitesDir)
      );
      expect(dirs.length).toBe(1); // Should have exactly one cached entry

      const metadataPath = join(websitesDir, dirs[0], "metadata.json");
      await writeFile(metadataPath, "invalid json");

      expect(await cache.has(url!)).toBe(false);
      expect(await cache.get(url!)).toBe(null);
    });
  });
});
