import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { WebCrawler, parseURL } from "@codefetch/sdk";
import { createConsola } from "consola";

// Mock fetch globally
globalThis.fetch = vi.fn();

describe("WebCrawler", () => {
  let crawler: WebCrawler;
  let logger: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    logger = createConsola({ level: -999 }); // Silent logger
  });

  afterEach(async () => {
    // Cleanup if needed
  });

  describe("Basic Crawling", () => {
    it("should crawl a simple website", async () => {
      const baseUrl = parseURL("https://example.com");
      const mockFetch = globalThis.fetch as any;

      // Mock responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([["content-type", "text/html"]]),
          text: async () => `
            <html>
              <head><title>Home Page</title></head>
              <body>
                <h1>Welcome</h1>
                <p>This is the home page.</p>
                <a href="/about">About Us</a>
              </body>
            </html>
          `,
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([["content-type", "text/html"]]),
          text: async () => `
            <html>
              <head><title>About Page</title></head>
              <body>
                <h1>About Us</h1>
                <p>This is the about page.</p>
              </body>
            </html>
          `,
        });

      crawler = new WebCrawler(
        baseUrl!,
        {
          maxDepth: 1,
          maxPages: 10,
          ignoreRobots: true,
        },
        logger
      );

      const results = await crawler.crawl();

      // Check that results were returned
      expect(results).toHaveLength(2);
      expect(results[0].url).toBe("https://example.com");
      expect(results[1].url).toBe("https://example.com/about");

      // Check that fetch was called correctly
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com",
        expect.any(Object)
      );
    });

    it("should respect maxDepth", async () => {
      const baseUrl = parseURL("https://example.com");
      const mockFetch = globalThis.fetch as any;

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/html"]]),
        text: async () => `
          <html>
            <body>
              <a href="/level1">Level 1</a>
            </body>
          </html>
        `,
      });

      crawler = new WebCrawler(
        baseUrl!,
        {
          maxDepth: 0, // Should only crawl the root
          maxPages: 10,
          ignoreRobots: true,
        },
        logger
      );

      await crawler.crawl();

      // Should only fetch the root page
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should respect maxPages", async () => {
      const baseUrl = parseURL("https://example.com");
      const mockFetch = globalThis.fetch as any;

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/html"]]),
        text: async () => `
          <html>
            <body>
              <a href="/page1">Page 1</a>
              <a href="/page2">Page 2</a>
              <a href="/page3">Page 3</a>
            </body>
          </html>
        `,
      });

      crawler = new WebCrawler(
        baseUrl!,
        {
          maxDepth: 2,
          maxPages: 2, // Should only crawl 2 pages
          ignoreRobots: true,
        },
        logger
      );

      await crawler.crawl();

      // Should only fetch 2 pages
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("robots.txt handling", () => {
    it("should respect robots.txt", async () => {
      const baseUrl = parseURL("https://example.com");
      const mockFetch = globalThis.fetch as any;

      // Mock robots.txt
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `
User-agent: *
Disallow: /private/
Allow: /public/

Sitemap: https://example.com/sitemap.xml
          `,
        })
        // Mock sitemap.xml
        .mockResolvedValueOnce({
          ok: false,
        })
        // Mock sitemap_index.xml
        .mockResolvedValueOnce({
          ok: false,
        })
        // Mock sitemap.xml (from robots.txt)
        .mockResolvedValueOnce({
          ok: false,
        })
        // Mock main page
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([["content-type", "text/html"]]),
          text: async () => `
            <html>
              <body>
                <a href="/public/page">Public Page</a>
                <a href="/private/page">Private Page</a>
              </body>
            </html>
          `,
        })
        // Mock public page
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([["content-type", "text/html"]]),
          text: async () => `<html><body>Public content</body></html>`,
        });

      crawler = new WebCrawler(
        baseUrl!,
        {
          maxDepth: 1,
          maxPages: 10,
          ignoreRobots: false,
        },
        logger
      );

      await crawler.crawl();

      // Check that private page was not fetched
      const calls = mockFetch.mock.calls.map((call: any) => call[0]);
      expect(calls).toContain("https://example.com/robots.txt");
      expect(calls).toContain("https://example.com");
      expect(calls).toContain("https://example.com/public/page");
      expect(calls).not.toContain("https://example.com/private/page");
    });
  });

  describe("Error handling", () => {
    it("should handle fetch errors gracefully", async () => {
      const baseUrl = parseURL("https://example.com");
      const mockFetch = globalThis.fetch as any;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([["content-type", "text/html"]]),
          text: async () => `
            <html>
              <body>
                <a href="/error">Error Page</a>
              </body>
            </html>
          `,
        })
        .mockRejectedValueOnce(new Error("Network error"));

      crawler = new WebCrawler(
        baseUrl!,
        {
          maxDepth: 1,
          maxPages: 10,
          ignoreRobots: true,
        },
        logger
      );

      const results = await crawler.crawl();

      // Should still return results with error noted
      expect(results).toHaveLength(2);
      expect(results[0].url).toBe("https://example.com");
      expect(results[1].error).toContain("Network error");
    });

    it("should skip non-HTML content", async () => {
      const baseUrl = parseURL("https://example.com");
      const mockFetch = globalThis.fetch as any;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([["content-type", "text/html"]]),
          text: async () => `
            <html>
              <body>
                <a href="/data.json">JSON Data</a>
              </body>
            </html>
          `,
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([["content-type", "application/json"]]),
          text: async () => `{"data": "value"}`,
        });

      crawler = new WebCrawler(
        baseUrl!,
        {
          maxDepth: 1,
          maxPages: 10,
          ignoreRobots: true,
        },
        logger
      );

      const results = await crawler.crawl();

      // Should note the error for non-HTML content
      expect(results).toHaveLength(2);
      expect(results[1].error).toContain("Not HTML content");
    });
  });

  describe("Link extraction", () => {
    it("should only crawl same-domain links", async () => {
      const baseUrl = parseURL("https://example.com");
      const mockFetch = globalThis.fetch as any;

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/html"]]),
        text: async () => `
          <html>
            <body>
              <a href="/internal">Internal Link</a>
              <a href="https://example.com/same-domain">Same Domain</a>
              <a href="https://other.com/external">External Link</a>
            </body>
          </html>
        `,
      });

      crawler = new WebCrawler(
        baseUrl!,
        {
          maxDepth: 1,
          maxPages: 10,
          ignoreRobots: true,
        },
        logger
      );

      await crawler.crawl();

      // Check that external links were not crawled
      const calls = mockFetch.mock.calls.map((call: any) => call[0]);
      expect(calls).toContain("https://example.com");
      expect(calls).toContain("https://example.com/internal");
      expect(calls).toContain("https://example.com/same-domain");
      expect(calls).not.toContain("https://other.com/external");
    });

    it("should skip non-content URLs", async () => {
      const baseUrl = parseURL("https://example.com");
      const mockFetch = globalThis.fetch as any;

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/html"]]),
        text: async () => `
          <html>
            <body>
              <a href="/page">Normal Page</a>
              <a href="/image.jpg">Image</a>
              <a href="/document.pdf">PDF</a>
              <a href="/login">Login</a>
              <a href="/api/data">API</a>
              <a href="#section">Anchor</a>
            </body>
          </html>
        `,
      });

      crawler = new WebCrawler(
        baseUrl!,
        {
          maxDepth: 1,
          maxPages: 10,
          ignoreRobots: true,
        },
        logger
      );

      await crawler.crawl();

      // Should only crawl the normal page
      const calls = mockFetch.mock.calls.map((call: any) => call[0]);
      expect(calls).toContain("https://example.com");
      expect(calls).toContain("https://example.com/page");
      expect(calls.length).toBe(2); // Only root and /page
    });
  });
});
