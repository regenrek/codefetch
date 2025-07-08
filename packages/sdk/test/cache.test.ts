import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { WebCache } from "../src/web/cache";
import { parseURL } from "../src/web/url-handler";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm, readdir, mkdir, writeFile } from "node:fs/promises";

describe("Cache Functionality", () => {
  let tempDir: string;
  let cache: WebCache;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "codefetch-cache-test-"));
    cache = new WebCache({
      cacheDir: tempDir,
      ttlHours: 1,
      maxSizeMB: 10,
    });
    await cache.init();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("WebCache", () => {
    test("should initialize cache directory", async () => {
      const dirs = await readdir(tempDir);
      expect(dirs).toContain("websites");
      expect(dirs).toContain("repos");
    });

    test("should check if cache entry exists", async () => {
      const parsedUrl = parseURL("https://github.com/user/repo");
      if (!parsedUrl) throw new Error("Failed to parse URL");

      // Initially should not exist
      const exists = await cache.has(parsedUrl);
      expect(exists).toBe(false);

      // Set content
      await cache.set(parsedUrl, "/path/to/repo");

      // Now should exist
      const existsAfter = await cache.has(parsedUrl);
      expect(existsAfter).toBe(true);
    });

    test("should get cached content", async () => {
      const parsedUrl = parseURL("https://github.com/user/repo");
      if (!parsedUrl) throw new Error("Failed to parse URL");

      // Create a real temporary directory for the repo path
      const repoPath = await mkdtemp(join(tmpdir(), "test-repo-"));

      // Set content
      await cache.set(parsedUrl, repoPath);

      // Get content - note that for repos, content is the stored path
      const cached = await cache.get(parsedUrl);

      expect(cached).toBeDefined();
      // For git repos, the content is stored in repo-path.txt and read back
      expect(cached?.content).toBe(repoPath);
      expect(cached?.metadata.url).toBe(parsedUrl.url);

      // Clean up the temp repo directory
      await rm(repoPath, { recursive: true, force: true });
    });

    test("should return null for non-cached content", async () => {
      const parsedUrl = parseURL("https://github.com/user/notcached");
      if (!parsedUrl) throw new Error("Failed to parse URL");

      const cached = await cache.get(parsedUrl);
      expect(cached).toBeNull();
    });

    test("should handle cache expiry", async () => {
      const parsedUrl = parseURL("https://github.com/user/repo");
      if (!parsedUrl) throw new Error("Failed to parse URL");

      // Create a real temporary directory for the repo path
      const repoPath = await mkdtemp(join(tmpdir(), "test-repo-"));

      // Manually create expired cache
      const cacheDir = cache["getCacheDir"](parsedUrl);
      await mkdir(cacheDir, { recursive: true });

      const expiredMetadata = {
        url: parsedUrl.url,
        fetchedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      };

      await writeFile(
        join(cacheDir, "metadata.json"),
        JSON.stringify(expiredMetadata)
      );
      await writeFile(join(cacheDir, "repo-path.txt"), repoPath);

      // Should return null for expired content
      const cached = await cache.get(parsedUrl);
      expect(cached).toBeNull();

      // Clean up the temp repo directory
      await rm(repoPath, { recursive: true, force: true });
    });

    test("should delete cache entry", async () => {
      const parsedUrl = parseURL("https://github.com/user/repo");
      if (!parsedUrl) throw new Error("Failed to parse URL");

      // Create a real temporary directory for the repo path
      const repoPath = await mkdtemp(join(tmpdir(), "test-repo-"));

      // Set and verify
      await cache.set(parsedUrl, repoPath);
      expect(await cache.has(parsedUrl)).toBe(true);

      // Delete
      await cache.delete(parsedUrl);
      expect(await cache.has(parsedUrl)).toBe(false);

      // Clean up the temp repo directory
      await rm(repoPath, { recursive: true, force: true });
    });

    test("should clear all cache", async () => {
      const url1 = parseURL("https://github.com/user/repo1");
      const url2 = parseURL("https://github.com/user/repo2");

      if (!url1 || !url2) throw new Error("Failed to parse URLs");

      // Create real temporary directories for the repo paths
      const repoPath1 = await mkdtemp(join(tmpdir(), "test-repo1-"));
      const repoPath2 = await mkdtemp(join(tmpdir(), "test-repo2-"));

      await cache.set(url1, repoPath1);
      await cache.set(url2, repoPath2);

      // Clear cache
      await cache.clear();

      // Check that directories are empty
      const dirs = await readdir(tempDir);
      for (const dir of dirs) {
        const files = await readdir(join(tempDir, dir));
        expect(files).toHaveLength(0);
      }

      // Clean up the temp repo directories
      await rm(repoPath1, { recursive: true, force: true });
      await rm(repoPath2, { recursive: true, force: true });
    });

    test("should get cache statistics", async () => {
      const url1 = parseURL("https://github.com/user/repo1");
      const url2 = parseURL("https://github.com/user/repo2");

      if (!url1 || !url2) throw new Error("Failed to parse URLs");

      // Create real temporary directories for the repo paths
      const repoPath1 = await mkdtemp(join(tmpdir(), "test-repo1-"));
      const repoPath2 = await mkdtemp(join(tmpdir(), "test-repo2-"));

      await cache.set(url1, repoPath1);
      await cache.set(url2, repoPath2);

      const stats = await cache.getStats();

      expect(stats.entryCount).toBe(2);
      expect(stats.sizeMB).toBeGreaterThan(0);
      expect(stats.websiteCount).toBe(0);
      expect(stats.repoCount).toBe(2);

      // Clean up the temp repo directories
      await rm(repoPath1, { recursive: true, force: true });
      await rm(repoPath2, { recursive: true, force: true });
    });

    test("should handle concurrent access", async () => {
      const urls = Array.from({ length: 10 }, (_, i) =>
        parseURL(`https://github.com/user/repo${i}`)
      ).filter(Boolean) as any[];

      // Create real temporary directories for each repo
      const repoPaths = await Promise.all(
        urls.map((_, i) => mkdtemp(join(tmpdir(), `test-repo${i}-`)))
      );

      // Set multiple entries concurrently
      await Promise.all(urls.map((url, i) => cache.set(url, repoPaths[i])));

      // Get multiple entries concurrently
      const results = await Promise.all(urls.map((url) => cache.get(url)));

      for (const [i, result] of results.entries()) {
        expect(result).toBeDefined();
        // Content should match what was set
        expect(result?.content).toBe(repoPaths[i]);
      }

      // Clean up all temp repo directories
      await Promise.all(
        repoPaths.map((path) => rm(path, { recursive: true, force: true }))
      );
    });

    test("should cleanup if needed when size exceeds limit", async () => {
      // Create a small cache with low size limit
      const smallCache = new WebCache({
        cacheDir: tempDir,
        ttlHours: 1,
        maxSizeMB: 0.001, // 1KB limit
      });
      await smallCache.init();

      const parsedUrl = parseURL("https://github.com/user/repo");
      if (!parsedUrl) throw new Error("Failed to parse URL");

      // Create a real temporary directory for the repo path
      const repoPath = await mkdtemp(join(tmpdir(), "test-repo-"));

      // This should trigger cleanup
      await smallCache.set(parsedUrl, repoPath);

      // Cache should still work
      const exists = await smallCache.has(parsedUrl);
      expect(exists).toBe(true);

      // Clean up the temp repo directory
      await rm(repoPath, { recursive: true, force: true });
    });

    test("should handle metadata with headers", async () => {
      const parsedUrl = parseURL("https://github.com/user/repo");
      if (!parsedUrl) throw new Error("Failed to parse URL");

      // Create a real temporary directory for the repo path
      const repoPath = await mkdtemp(join(tmpdir(), "test-repo-"));

      const headers = {
        "content-type": "text/html",
        "cache-control": "max-age=3600",
      };

      await cache.set(parsedUrl, repoPath, { headers });

      const cached = await cache.get(parsedUrl);
      expect(cached).toBeDefined();
      expect(cached?.metadata.headers).toEqual(headers);

      // Clean up the temp repo directory
      await rm(repoPath, { recursive: true, force: true });
    });

    test("should validate repo path still exists", async () => {
      const parsedUrl = parseURL("https://github.com/user/repo");
      if (!parsedUrl) throw new Error("Failed to parse URL");

      // Create a temp directory that we'll delete
      const tempRepoDir = await mkdtemp(join(tmpdir(), "temp-repo-"));

      await cache.set(parsedUrl, tempRepoDir);

      // Delete the temp directory
      await rm(tempRepoDir, { recursive: true, force: true });

      // Cache should return null since path no longer exists
      const cached = await cache.get(parsedUrl);
      expect(cached).toBeNull();
    });

    test("should handle different URL types", async () => {
      const gitUrl = parseURL("https://github.com/user/repo");
      const gitlabUrl = parseURL("https://gitlab.com/user/project");

      if (!gitUrl || !gitlabUrl) throw new Error("Failed to parse URLs");

      // Create real temporary directories for the repo paths
      const githubPath = await mkdtemp(join(tmpdir(), "test-github-"));
      const gitlabPath = await mkdtemp(join(tmpdir(), "test-gitlab-"));

      await cache.set(gitUrl, githubPath);
      await cache.set(gitlabUrl, gitlabPath);

      const gitCached = await cache.get(gitUrl);
      const gitlabCached = await cache.get(gitlabUrl);

      expect(gitCached).toBeDefined();
      expect(gitlabCached).toBeDefined();
      expect(gitCached?.content).toBe(githubPath);
      expect(gitlabCached?.content).toBe(gitlabPath);

      // Clean up the temp repo directories
      await rm(githubPath, { recursive: true, force: true });
      await rm(gitlabPath, { recursive: true, force: true });
    });

    test("should create unique cache keys", async () => {
      const url1 = parseURL("https://github.com/user/repo");
      const url2 = parseURL("https://github.com/user/repo2");
      const url3 = parseURL("https://github.com/user2/repo");

      if (!url1 || !url2 || !url3) throw new Error("Failed to parse URLs");

      const dir1 = cache["getCacheDir"](url1);
      const dir2 = cache["getCacheDir"](url2);
      const dir3 = cache["getCacheDir"](url3);

      // All directories should be different
      expect(dir1).not.toBe(dir2);
      expect(dir1).not.toBe(dir3);
      expect(dir2).not.toBe(dir3);
    });

    test("should handle cache with branch/tag refs", async () => {
      const mainUrl = parseURL("https://github.com/user/repo/tree/main");
      const devUrl = parseURL("https://github.com/user/repo/tree/dev");

      if (!mainUrl || !devUrl) throw new Error("Failed to parse URLs");

      // Create real temporary directories for the repo paths
      const mainPath = await mkdtemp(join(tmpdir(), "test-main-"));
      const devPath = await mkdtemp(join(tmpdir(), "test-dev-"));

      await cache.set(mainUrl, mainPath);
      await cache.set(devUrl, devPath);

      const mainCached = await cache.get(mainUrl);
      const devCached = await cache.get(devUrl);

      expect(mainCached).toBeDefined();
      expect(devCached).toBeDefined();
      expect(mainCached?.content).toBe(mainPath);
      expect(devCached?.content).toBe(devPath);

      // Clean up the temp repo directories
      await rm(mainPath, { recursive: true, force: true });
      await rm(devPath, { recursive: true, force: true });
    });
  });
});
