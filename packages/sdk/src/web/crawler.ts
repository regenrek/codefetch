import { URL } from "node:url";
import type { ConsolaInstance } from "consola";
import {
  extractMainContent,
  htmlToMarkdown,
  cleanMarkdown,
} from "./html-to-markdown.js";
import type { ParsedURL } from "./url-handler.js";

export interface CrawlerOptions {
  maxDepth: number;
  maxPages: number;
  ignoreCors?: boolean;
  ignoreRobots?: boolean;
  userAgent?: string;
  delay?: number; // Delay between requests in ms
}

export interface CrawlerResult {
  url: string;
  title: string;
  content: string;
  links: string[];
  depth: number;
  error?: string;
}

export class WebCrawler {
  private visited = new Set<string>();
  private visitedPaths = new Set<string>(); // Track unique paths for max-pages limit
  private toVisit: Array<{ url: string; depth: number }> = [];
  private results: CrawlerResult[] = [];
  private robotsCache = new Map<string, RobotsRule[]>();
  private sitemapUrls = new Set<string>();

  constructor(
    private baseUrl: ParsedURL,
    private options: CrawlerOptions,
    private logger: ConsolaInstance
  ) {
    this.toVisit.push({ url: baseUrl.url, depth: 0 });
  }

  /**
   * Start crawling from the base URL
   */
  async crawl(): Promise<CrawlerResult[]> {
    this.logger.info(`Starting crawl of ${this.baseUrl.url}`);

    // Check robots.txt first
    if (!this.options.ignoreRobots) {
      await this.loadRobotsTxt();
      await this.loadSitemap();
    }

    // Add sitemap URLs to crawl queue
    let sitemapCount = 0;
    for (const url of this.sitemapUrls) {
      if (this.shouldCrawlUrl(url)) {
        this.toVisit.push({ url, depth: 1 });
        sitemapCount++;
      }
    }
    this.logger.info(`Added ${sitemapCount} URLs from sitemap to crawl queue`);

    // Start crawling
    let lastProgressReport = Date.now();
    while (
      this.toVisit.length > 0 &&
      this.visitedPaths.size < this.options.maxPages
    ) {
      const { url, depth } = this.toVisit.shift()!;

      if (this.visited.has(url) || depth > this.options.maxDepth) {
        this.logger.debug(
          `Skipping ${url} (already visited: ${this.visited.has(url)}, depth: ${depth} > ${this.options.maxDepth}: ${depth > this.options.maxDepth})`
        );
        continue;
      }

      // Check if we've reached max unique pages
      if (this.visitedPaths.size >= this.options.maxPages) {
        this.logger.debug(
          `Reached max pages limit (${this.options.maxPages} unique pages)`
        );
        break;
      }

      // Check if allowed by robots.txt
      if (!this.options.ignoreRobots && !this.isAllowedByRobots(url)) {
        this.logger.debug(`Skipping ${url} (blocked by robots.txt)`);
        continue;
      }

      await this.crawlPage(url, depth);

      // Report progress every 5 seconds
      const now = Date.now();
      if (now - lastProgressReport > 5000) {
        this.logger.info(
          `Progress: ${this.visitedPaths.size}/${this.options.maxPages} unique pages crawled`
        );
        lastProgressReport = now;
      }

      // Delay between requests
      if (this.options.delay && this.toVisit.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.options.delay));
      }
    }

    this.logger.success(
      `Crawled ${this.visitedPaths.size} unique pages (${this.visited.size} total URLs) (max depth: ${this.options.maxDepth}, max pages: ${this.options.maxPages})`
    );
    this.logger.info(`URLs still in queue: ${this.toVisit.length}`);

    return this.results;
  }

  /**
   * Crawl a single page
   */
  private async crawlPage(url: string, depth: number): Promise<void> {
    // Normalize URL before marking as visited
    const normalizedUrl = this.normalizeUrl(url);
    this.visited.add(normalizedUrl);

    // Extract path for unique page counting
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname || "/";
      this.visitedPaths.add(path);
    } catch {
      // If URL parsing fails, still count it
      this.visitedPaths.add(url);
    }

    this.logger.debug(`Crawling: ${url} (depth: ${depth})`);

    try {
      // Fetch the page
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.options.userAgent || "Codefetch/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        throw new Error(`Not HTML content: ${contentType}`);
      }

      const html = await response.text();

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "Untitled";

      // Process HTML with timeout to prevent hanging
      let cleanedMarkdown = "";
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error("HTML processing timeout")), 5000);
        });

        // Race between processing and timeout
        const processingPromise = (async () => {
          // Extract main content
          const mainContent = extractMainContent(html, url);

          // Convert to markdown
          const markdown = htmlToMarkdown(mainContent, {
            baseUrl: url,
            includeImages: false,
            includeLinks: true,
          });

          return cleanMarkdown(markdown);
        })();

        cleanedMarkdown = await Promise.race([
          processingPromise,
          timeoutPromise,
        ]);
      } catch {
        this.logger.warn(`HTML processing timeout for ${url}, using fallback`);
        // Fallback: just extract text content without complex parsing
        cleanedMarkdown = this.extractTextFallback(html);
      }

      // Extract links for further crawling
      const links = this.extractLinks(html, url);

      // Add to results
      this.results.push({
        url,
        title,
        content: cleanedMarkdown,
        links: links.filter((link) => this.shouldCrawlUrl(link)),
        depth,
      });

      // Queue new links
      if (depth < this.options.maxDepth) {
        let addedCount = 0;
        for (const link of links) {
          const normalizedLink = this.normalizeUrl(link);
          if (this.shouldCrawlUrl(link) && !this.visited.has(normalizedLink)) {
            this.toVisit.push({ url: link, depth: depth + 1 });
            addedCount++;
          }
        }
        this.logger.debug(
          `Added ${addedCount} new URLs to crawl queue from ${url}`
        );
      }

      this.logger.debug(`✓ Crawled: ${title}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to crawl ${url}: ${errorMessage}`);

      this.results.push({
        url,
        title: "Error",
        content: "",
        links: [],
        depth,
        error: errorMessage,
      });
    }
  }

  /**
   * Extract links from HTML
   */
  private extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      try {
        const url = new URL(match[1], baseUrl);
        // Only include HTTP(S) links
        if (url.protocol === "http:" || url.protocol === "https:") {
          links.push(url.href);
        }
      } catch {
        // Invalid URL, skip
      }
    }

    const uniqueLinks = [...new Set(links)];
    this.logger.debug(
      `Extracted ${uniqueLinks.length} unique links from ${baseUrl}`
    );
    return uniqueLinks;
  }

  /**
   * Check if URL should be crawled
   */
  private shouldCrawlUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const baseUrlObj = new URL(this.baseUrl.url);

      // Only crawl same domain by default
      if (urlObj.hostname !== baseUrlObj.hostname) {
        return false;
      }

      // Skip common non-content URLs
      const skipPatterns = [
        /\.(jpg|jpeg|png|gif|pdf|zip|exe|dmg|iso|tar|gz)$/i,
        /\/(?:login|signin|signup|register|logout|auth)/i,
        /\/(api|graphql)\//i,
        /#/,
      ];

      const shouldSkip = skipPatterns.some((pattern) => pattern.test(url));
      if (shouldSkip) {
        this.logger.debug(`Skipping URL ${url} due to pattern match`);
      }
      return !shouldSkip;
    } catch {
      return false;
    }
  }

  /**
   * Convert URL to safe file ID
   */
  private urlToId(url: string): string {
    return url
      .replace(/^https?:\/\//, "")
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100);
  }

  /**
   * Load and parse robots.txt
   */
  private async loadRobotsTxt(): Promise<void> {
    try {
      const robotsUrl = new URL("/robots.txt", this.baseUrl.url).href;
      const response = await fetch(robotsUrl);

      if (response.ok) {
        const text = await response.text();
        const rules = this.parseRobotsTxt(text);
        const hostname = new URL(this.baseUrl.url).hostname;
        this.robotsCache.set(hostname, rules);

        // Extract sitemap URL if present
        const sitemapMatch = text.match(/^Sitemap:\s*(.+)$/im);
        if (sitemapMatch) {
          this.sitemapUrls.add(sitemapMatch[1].trim());
        }
      }
    } catch {
      // Ignore robots.txt errors
    }
  }

  /**
   * Parse robots.txt content
   */
  private parseRobotsTxt(content: string): RobotsRule[] {
    const rules: RobotsRule[] = [];
    const lines = content.split("\n");
    let currentUserAgent = "*";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed) continue;

      const [key, ...valueParts] = trimmed.split(":");
      const value = valueParts.join(":").trim();

      if (key.toLowerCase() === "user-agent") {
        currentUserAgent = value.toLowerCase();
      } else if (key.toLowerCase() === "disallow" && value) {
        rules.push({
          userAgent: currentUserAgent,
          path: value,
          allow: false,
        });
      } else if (key.toLowerCase() === "allow" && value) {
        rules.push({
          userAgent: currentUserAgent,
          path: value,
          allow: true,
        });
      }
    }

    return rules;
  }

  /**
   * Check if URL is allowed by robots.txt
   */
  private isAllowedByRobots(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const rules = this.robotsCache.get(urlObj.hostname) || [];

      // Find applicable rules
      const applicableRules = rules.filter(
        (rule) =>
          rule.userAgent === "*" ||
          rule.userAgent === "codefetch" ||
          this.options.userAgent?.toLowerCase().includes(rule.userAgent)
      );

      // Check rules (more specific paths take precedence)
      const sortedRules = applicableRules.sort(
        (a, b) => b.path.length - a.path.length
      );

      for (const rule of sortedRules) {
        if (urlObj.pathname.startsWith(rule.path)) {
          return rule.allow;
        }
      }

      return true; // Default allow
    } catch {
      return true;
    }
  }

  /**
   * Load and parse sitemap.xml
   */
  private async loadSitemap(): Promise<void> {
    // Try common sitemap locations
    const sitemapUrls = [
      new URL("/sitemap.xml", this.baseUrl.url).href,
      new URL("/sitemap_index.xml", this.baseUrl.url).href,
    ];

    // Add any sitemaps found in robots.txt
    for (const url of this.sitemapUrls) {
      sitemapUrls.push(url);
    }

    for (const sitemapUrl of sitemapUrls) {
      try {
        const response = await fetch(sitemapUrl);
        if (response.ok) {
          const xml = await response.text();
          this.parseSitemap(xml);
        }
      } catch {
        // Ignore sitemap errors
      }
    }
  }

  /**
   * Parse sitemap XML
   */
  private parseSitemap(xml: string): void {
    // Simple regex-based parsing (avoiding XML parser dependency)
    const urlMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/gi);

    for (const match of urlMatches) {
      const url = match[1].trim();
      if (this.shouldCrawlUrl(url)) {
        this.sitemapUrls.add(url);
      }
    }

    // Check for sitemap index
    const sitemapMatches = xml.matchAll(/<sitemap>[^<]*<loc>([^<]+)<\/loc>/gi);
    for (const match of sitemapMatches) {
      this.sitemapUrls.add(match[1].trim());
    }
  }

  /**
   * Normalize URL for deduplication
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove trailing slash from path (except for root)
      if (urlObj.pathname !== "/" && urlObj.pathname.endsWith("/")) {
        urlObj.pathname = urlObj.pathname.slice(0, -1);
      }
      // Remove common tracking parameters
      const paramsToRemove = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "fbclid",
        "gclid",
      ];
      for (const param of paramsToRemove) urlObj.searchParams.delete(param);

      // Remove hash
      urlObj.hash = "";

      return urlObj.href;
    } catch {
      return url;
    }
  }

  /**
   * Simple text extraction fallback when HTML parsing times out
   */
  private extractTextFallback(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

    // Extract body content if available
    const bodyMatch = text.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      text = bodyMatch[1];
    }

    // Remove all HTML tags
    text = text.replace(/<[^>]+>/g, " ");

    // Clean up whitespace
    text = text.replace(/\s+/g, " ").trim();

    // Truncate if too long
    if (text.length > 5000) {
      text = text.slice(0, 5000) + "...";
    }

    return text;
  }
}

interface RobotsRule {
  userAgent: string;
  path: string;
  allow: boolean;
}
