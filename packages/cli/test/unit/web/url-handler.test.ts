import { describe, it, expect } from "vitest";
import {
  validateURL,
  detectGitProvider,
  parseURL,
  extractCacheKey,
  urlToFilePath,
} from "../../../src/web/url-handler.js";

describe("URL Validation", () => {
  it("should accept valid HTTP/HTTPS URLs", () => {
    expect(validateURL("https://example.com")).toEqual({ valid: true });
    expect(validateURL("http://example.com/path")).toEqual({ valid: true });
    expect(validateURL("https://docs.example.com/api/v1")).toEqual({
      valid: true,
    });
  });

  it("should reject invalid protocols", () => {
    expect(validateURL("file:///etc/passwd")).toEqual({
      valid: false,
      error: expect.stringContaining("Invalid protocol"),
    });
    expect(validateURL("ftp://example.com")).toEqual({
      valid: false,
      error: expect.stringContaining("Invalid protocol"),
    });
    expect(validateURL("ssh://git@github.com")).toEqual({
      valid: false,
      error: expect.stringContaining("Invalid protocol"),
    });
  });

  it("should reject localhost and local IPs", () => {
    expect(validateURL("http://localhost")).toEqual({
      valid: false,
      error: expect.stringContaining("Blocked hostname"),
    });
    expect(validateURL("http://127.0.0.1")).toEqual({
      valid: false,
      error: expect.stringContaining("Blocked hostname"),
    });
    expect(validateURL("https://0.0.0.0:8080")).toEqual({
      valid: false,
      error: expect.stringContaining("Blocked hostname"),
    });
  });

  it("should reject private IP ranges", () => {
    expect(validateURL("http://10.0.0.1")).toEqual({
      valid: false,
      error: expect.stringContaining("Private IP address"),
    });
    expect(validateURL("http://192.168.1.1")).toEqual({
      valid: false,
      error: expect.stringContaining("Private IP address"),
    });
    expect(validateURL("http://172.16.0.1")).toEqual({
      valid: false,
      error: expect.stringContaining("Private IP address"),
    });
  });

  it("should reject path traversal patterns", () => {
    expect(validateURL("https://example.com/../etc/passwd")).toEqual({
      valid: false,
      error: expect.stringContaining("suspicious path traversal"),
    });
    expect(validateURL("https://example..com")).toEqual({
      valid: false,
      error: expect.stringContaining("suspicious path traversal"),
    });
  });

  it("should handle malformed URLs", () => {
    expect(validateURL("not-a-url")).toEqual({
      valid: false,
      error: expect.stringContaining("Invalid URL format"),
    });
    expect(validateURL("")).toEqual({
      valid: false,
      error: expect.stringContaining("Invalid URL format"),
    });
  });
});

describe("Git Provider Detection", () => {
  it("should detect GitHub URLs", () => {
    expect(detectGitProvider("https://github.com/user/repo")).toBe("github");
    expect(detectGitProvider("https://github.com/org/project.git")).toBe(
      "github"
    );
    expect(detectGitProvider("https://github.com/user/repo/tree/main")).toBe(
      "github"
    );
  });

  it("should detect GitLab URLs", () => {
    expect(detectGitProvider("https://gitlab.com/user/repo")).toBe("gitlab");
    expect(detectGitProvider("https://gitlab.com/group/subgroup/project")).toBe(
      "gitlab"
    );
  });

  it("should detect Bitbucket URLs", () => {
    expect(detectGitProvider("https://bitbucket.org/user/repo")).toBe(
      "bitbucket"
    );
    expect(detectGitProvider("https://bitbucket.org/team/project.git")).toBe(
      "bitbucket"
    );
  });

  it("should return null for non-git URLs", () => {
    expect(detectGitProvider("https://example.com")).toBe(null);
    expect(detectGitProvider("https://npmjs.com/package/foo")).toBe(null);
  });
});

describe("URL Parsing", () => {
  it("should parse regular website URLs", () => {
    const parsed = parseURL("https://docs.example.com/api/v1");
    expect(parsed).toEqual({
      type: "website",
      url: "https://docs.example.com/api/v1",
      normalizedUrl: "https://docs.example.com/api/v1",
      domain: "docs.example.com",
      path: "/api/v1",
    });
  });

  it("should parse GitHub repository URLs", () => {
    const parsed = parseURL("https://github.com/facebook/react");
    expect(parsed).toEqual({
      type: "git-repository",
      url: "https://github.com/facebook/react",
      normalizedUrl: "https://github.com/facebook/react",
      domain: "github.com",
      path: "/facebook/react",
      gitProvider: "github",
      gitOwner: "facebook",
      gitRepo: "react",
      gitRef: undefined,
    });
  });

  it("should parse GitHub URLs with branch/commit references", () => {
    const branchParsed = parseURL(
      "https://github.com/user/repo/tree/feature/branch"
    );
    expect(branchParsed?.gitRef).toBe("feature/branch");

    const commitParsed = parseURL("https://github.com/user/repo/commit/abc123");
    expect(commitParsed?.gitRef).toBe("abc123");

    const tagParsed = parseURL(
      "https://github.com/user/repo/releases/tag/v1.0.0"
    );
    expect(tagParsed?.gitRef).toBe("v1.0.0");
  });

  it("should normalize repository names", () => {
    const parsed = parseURL("https://github.com/user/repo.git");
    expect(parsed?.gitRepo).toBe("repo");
    expect(parsed?.normalizedUrl).toBe("https://github.com/user/repo");
  });

  it("should throw on invalid URLs", () => {
    expect(() => parseURL("file:///etc/passwd")).toThrow();
    expect(() => parseURL("http://localhost")).toThrow();
  });
});

describe("Cache Key Extraction", () => {
  it("should generate cache keys for websites", () => {
    const parsed = parseURL("https://example.com/docs/api");
    const key = extractCacheKey(parsed!);
    expect(key).toMatch(/^example\.com-docs-api/);
  });

  it("should generate cache keys for git repositories", () => {
    const parsed = parseURL("https://github.com/user/repo");
    const key = extractCacheKey(parsed!);
    expect(key).toBe("github-user-repo-default");
  });

  it("should include git ref in cache key", () => {
    const parsed = parseURL("https://github.com/user/repo/tree/develop");
    const key = extractCacheKey(parsed!);
    expect(key).toBe("github-user-repo-develop");
  });
});

describe("URL to File Path Conversion", () => {
  it("should convert URLs to valid file paths", () => {
    expect(urlToFilePath("https://example.com")).toBe("example.com.html");
    expect(urlToFilePath("https://example.com/docs")).toBe(
      "example.com/docs.html"
    );
    expect(urlToFilePath("https://example.com/api/users")).toBe(
      "example.com/api/users.html"
    );
  });

  it("should preserve existing file extensions", () => {
    expect(urlToFilePath("https://example.com/style.css")).toBe(
      "example.com/style.css"
    );
    expect(urlToFilePath("https://example.com/script.js")).toBe(
      "example.com/script.js"
    );
    expect(urlToFilePath("https://example.com/data.json")).toBe(
      "example.com/data.json"
    );
  });
});
