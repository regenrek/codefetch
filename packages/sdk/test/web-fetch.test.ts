import { describe, test, expect, beforeEach, vi } from "vitest";
import { fetchFromWeb } from "../src/web/sdk-web-fetch";
import { validateURL, parseURL } from "../src/web/url-handler";
import { htmlToMarkdown } from "../src/web/html-to-markdown";
import { http, HttpResponse } from "msw";
import { server } from "./mocks/server.js";

describe("Web Fetching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateURL", () => {
    test("should validate http URLs", () => {
      const result = validateURL("http://example.com");
      expect(result.valid).toBe(true);
    });

    test("should validate https URLs", () => {
      const result = validateURL("https://example.com");
      expect(result.valid).toBe(true);
    });

    test("should validate GitHub URLs", () => {
      const result = validateURL("https://github.com/user/repo");
      expect(result.valid).toBe(true);
    });

    test("should reject invalid URLs", () => {
      const result = validateURL("not-a-url");
      // The SDK treats this as a relative URL and adds https://
      expect(result.valid).toBe(true);
    });

    test("should reject git:// URLs", () => {
      const result = validateURL("git://github.com/user/repo.git");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid protocol");
    });

    test("should reject file:// URLs", () => {
      const result = validateURL("file:///etc/passwd");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("parseURL", () => {
    test("should parse GitHub repository URLs", () => {
      const result = parseURL("https://github.com/user/repo");
      expect(result).toBeDefined();
      expect(result?.type).toBe("git-repository");
      expect(result?.gitOwner).toBe("user");
      expect(result?.gitRepo).toBe("repo");
      expect(result?.gitProvider).toBe("github");
    });

    test("should parse GitHub file URLs", () => {
      const result = parseURL(
        "https://github.com/user/repo/blob/main/README.md"
      );
      expect(result).toBeDefined();
      expect(result?.type).toBe("git-repository");
      expect(result?.gitOwner).toBe("user");
      expect(result?.gitRepo).toBe("repo");
      expect(result?.gitRef).toBe("main/README.md");
    });

    test("should parse GitHub directory URLs", () => {
      const result = parseURL("https://github.com/user/repo/tree/main/src");
      expect(result).toBeDefined();
      expect(result?.type).toBe("git-repository");
      expect(result?.gitOwner).toBe("user");
      expect(result?.gitRepo).toBe("repo");
      expect(result?.gitRef).toBe("main/src");
    });

    test("should handle non-git URLs", () => {
      expect(() => parseURL("https://example.com/page")).toThrow(
        "Only GitHub, GitLab, and Bitbucket repository URLs are supported"
      );
    });

    test("should handle GitHub URLs with special characters", () => {
      const result = parseURL("https://github.com/my-org/my-repo.js");
      expect(result).toBeDefined();
      expect(result?.gitOwner).toBe("my-org");
      expect(result?.gitRepo).toBe("my-repo.js");
    });
  });

  describe("htmlToMarkdown", () => {
    test("should convert headers", () => {
      const html = "<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>";
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain("# Title");
      expect(markdown).toContain("## Subtitle");
      expect(markdown).toContain("### Section");
    });

    test("should convert paragraphs", () => {
      const html = "<p>First paragraph</p><p>Second paragraph</p>";
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain("First paragraph");
      expect(markdown).toContain("Second paragraph");
      expect(markdown.split("\n\n").length).toBeGreaterThan(1);
    });

    test("should convert lists", () => {
      const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain("- Item 1");
      expect(markdown).toContain("- Item 2");
    });

    test("should convert ordered lists", () => {
      const html = "<ol><li>First</li><li>Second</li></ol>";
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain("1. First");
      expect(markdown).toContain("2. Second");
    });

    test("should convert links", () => {
      const html = '<a href="https://example.com">Example</a>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain("[Example](https://example.com)");
    });

    test("should convert code blocks", () => {
      const html = "<pre><code>const x = 1;</code></pre>";
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain("```");
      expect(markdown).toContain("const x = 1;");
    });

    test("should convert inline code", () => {
      const html = "Use <code>npm install</code> to install";
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain("`npm install`");
    });

    test("should convert bold and italic", () => {
      const html = "<strong>bold</strong> and <em>italic</em>";
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain("**bold**");
      expect(markdown).toContain("*italic*");
    });

    test("should remove script and style tags", () => {
      const html = `
        <script>alert('xss');</script>
        <style>body { color: red; }</style>
        <p>Content</p>
      `;
      const markdown = htmlToMarkdown(html);
      expect(markdown).not.toContain("alert");
      expect(markdown).not.toContain("color: red");
      expect(markdown).toContain("Content");
    });

    test("should handle images", () => {
      const html = '<img src="image.png" alt="Description">';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain("![Description](image.png)");
    });

    test("should handle tables", () => {
      const html = `
        <table>
          <tr><th>Header 1</th><th>Header 2</th></tr>
          <tr><td>Cell 1</td><td>Cell 2</td></tr>
        </table>
      `;
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain("Header 1");
      expect(markdown).toContain("Header 2");
      expect(markdown).toContain("Cell 1");
      expect(markdown).toContain("Cell 2");
    });

    test("should handle blockquotes", () => {
      const html = "<blockquote>This is a quote</blockquote>";
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain("> This is a quote");
    });

    test("should handle horizontal rules", () => {
      const html = "Before<hr>After";
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain("---");
    });

    test("should preserve whitespace in pre tags", () => {
      const html = "<pre>  indented\n    more indented</pre>";
      const markdown = htmlToMarkdown(html, { preserveWhitespace: true });
      expect(markdown).toContain("  indented");
      expect(markdown).toContain("    more indented");
    });

    test("should handle custom replacements", () => {
      const html = "<div class='custom'>Custom content</div>";
      const markdown = htmlToMarkdown(html, {
        customReplacements: [
          {
            pattern: /<div class='custom'>(.*?)<\/div>/g,
            replacement: "CUSTOM: $1",
          },
        ],
      });
      expect(markdown).toContain("CUSTOM: Custom content");
    });

    test("should optionally exclude URLs", () => {
      const html = '<a href="https://example.com">Example</a>';
      const markdown = htmlToMarkdown(html, { includeUrls: false });
      expect(markdown).toContain("Example");
      expect(markdown).not.toContain("https://example.com");
    });
  });

  describe("fetchFromWeb", () => {
    test("should reject non-git URLs", async () => {
      await expect(
        fetchFromWeb("https://example.com", { verbose: 0 })
      ).rejects.toThrow(
        "Only GitHub, GitLab, and Bitbucket repository URLs are supported"
      );
    });

    test("should handle fetch errors", async () => {
      server.use(
        http.get("https://example.com/*", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(
        fetchFromWeb("https://example.com", { verbose: 0 })
      ).rejects.toThrow();
    });

    test("should reject completely invalid URLs", async () => {
      await expect(
        fetchFromWeb("https://not-a-url", { verbose: 0 })
      ).rejects.toThrow();
    });

    test("should validate GitHub repository URLs", () => {
      const result = parseURL("https://github.com/user/repo");
      expect(result).toBeDefined();
      expect(result?.gitProvider).toBe("github");
      expect(result?.gitOwner).toBe("user");
      expect(result?.gitRepo).toBe("repo");
    });

    test("should handle GitLab URLs", () => {
      const result = parseURL("https://gitlab.com/user/project");
      expect(result).toBeDefined();
      expect(result?.gitProvider).toBe("gitlab");
      expect(result?.gitOwner).toBe("user");
      expect(result?.gitRepo).toBe("project");
    });

    test("should handle Bitbucket URLs", () => {
      const result = parseURL("https://bitbucket.org/user/repo");
      expect(result).toBeDefined();
      expect(result?.gitProvider).toBe("bitbucket");
      expect(result?.gitOwner).toBe("user");
      expect(result?.gitRepo).toBe("repo");
    });

    test("should reject URLs with invalid protocols", () => {
      const result = validateURL("ftp://example.com/file.txt");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid protocol");
    });

    test("should reject localhost URLs", () => {
      const result = validateURL("https://localhost:3000");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Blocked hostname");
    });
  });
});
