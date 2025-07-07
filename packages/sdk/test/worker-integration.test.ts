/**
 * Integration tests for Cloudflare Worker compatibility
 * Run these with Miniflare or in a real Worker environment
 */

import { describe, test, expect, beforeAll } from "vitest";
import { 
  fetchFromWeb, 
  isCloudflareWorker, 
  getCacheSizeLimit,
  countTokens,
  htmlToMarkdown,
  generateMarkdown
} from "../src/worker.js";

describe("Worker Integration Tests", () => {
  describe("Environment Detection", () => {
    test("should detect Worker environment correctly", () => {
      // In test environment, should be false
      expect(isCloudflareWorker).toBe(false);
      
      // Cache limit should be Node.js default
      expect(getCacheSizeLimit()).toBe(100 * 1024 * 1024);
    });
  });

  describe("fetchFromWeb - GitHub", () => {
    test("should fetch small public GitHub repo", async () => {
      const result = await fetchFromWeb("https://github.com/octocat/Hello-World", {
        maxFiles: 5,
        extensions: [".md", ".txt"],
        verbose: 0
      });
      
      expect(result).toBeDefined();
      expect(result.markdown).toContain("Hello-World");
      expect(result.files.length).toBeLessThanOrEqual(5);
    });

    test("should reject repos without Content-Length", async () => {
      // This would need to be mocked or use a known endpoint
      // that doesn't provide Content-Length
    });

    test("should reject large repos in Worker environment", async () => {
      // Would need to mock isCloudflareWorker = true
      // and try to fetch a large repo
    });

    test("should handle GitHub API errors gracefully", async () => {
      await expect(
        fetchFromWeb("https://github.com/nonexistent/repo", {
          maxFiles: 1
        })
      ).rejects.toThrow();
    });
  });

  describe("fetchFromWeb - Websites", () => {
    test("should fetch and convert simple website", async () => {
      const result = await fetchFromWeb("https://example.com", {
        maxPages: 1,
        maxDepth: 0,
        verbose: 0
      });
      
      expect(result).toBeDefined();
      expect(result.markdown).toContain("Example Domain");
    });

    test("should respect maxPages limit", async () => {
      const result = await fetchFromWeb("https://example.com", {
        maxPages: 1,
        maxDepth: 10, // High depth but only 1 page
        verbose: 0
      });
      
      expect(result.files.length).toBe(1);
    });
  });

  describe("Core Utilities", () => {
    test("should count tokens correctly", async () => {
      const text = "Hello, World! This is a test.";
      const tokens = await countTokens(text, "cl100k");
      
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(20);
    });

    test("should convert HTML to markdown", () => {
      const html = "<h1>Title</h1><p>Paragraph with <strong>bold</strong></p>";
      const markdown = htmlToMarkdown(html);
      
      expect(markdown).toContain("# Title");
      expect(markdown).toContain("**bold**");
    });

    test("should generate markdown from files", async () => {
      const files = [
        { path: "test.js", content: "console.log('test');" },
        { path: "README.md", content: "# Test Project" }
      ];
      
      const markdown = await generateMarkdown(files, {
        includeTreeStructure: true
      });
      
      expect(markdown).toContain("test.js");
      expect(markdown).toContain("README.md");
      expect(markdown).toContain("console.log");
    });
  });

  describe("Error Scenarios", () => {
    test("should handle network errors", async () => {
      await expect(
        fetchFromWeb("https://invalid-domain-that-does-not-exist.com", {
          maxPages: 1
        })
      ).rejects.toThrow();
    });

    test("should handle invalid URLs", async () => {
      await expect(
        fetchFromWeb("not-a-url", {
          maxPages: 1
        })
      ).rejects.toThrow();
    });
  });
});