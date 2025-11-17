import { describe, it, expect } from "vitest";
import { validateURL, parseURL, extractCacheKey } from "codefetch-sdk";

describe("URL Validation", () => {
  it("should accept valid HTTP/HTTPS URLs", () => {
    expect(validateURL("https://example.com")).toEqual({ valid: true });
    expect(validateURL("http://example.com/path")).toEqual({ valid: true });
    expect(validateURL("https://docs.example.com/api/v1")).toEqual({
      valid: true,
    });
  });

  it("should handle URLs without protocol", () => {
    expect(validateURL("example.com")).toEqual({ valid: true });
    expect(validateURL("docs.example.com/path")).toEqual({ valid: true });
    expect(validateURL("github.com/user/repo")).toEqual({ valid: true });
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
    // "not-a-url" is now valid since we add https:// automatically
    expect(validateURL("not-a-url")).toEqual({ valid: true });

    // Empty string should still fail
    expect(validateURL("")).toEqual({
      valid: false,
      error: expect.stringContaining("Invalid URL format"),
    });
  });
});

describe("URL Parsing", () => {
  it("should reject non-git repository URLs", () => {
    expect(parseURL("https://docs.example.com/api/v1")).toBeNull();
    expect(parseURL("https://example.com")).toBeNull();
    expect(parseURL("docs.example.com/api/guide")).toBeNull();
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
      gitHost: "github.com",
      gitOwner: "facebook",
      gitRepo: "react",
      gitRef: undefined,
    });
  });

  it("should parse GitHub URLs with branch/commit references", () => {
    const branchParsed = parseURL(
      "https://github.com/user/repo/tree/feature-branch"
    );
    expect(branchParsed?.gitRef).toBe("feature-branch");

    const slashBranchParsed = parseURL(
      "https://github.com/user/repo/tree/feature/branch"
    );
    // The regex only captures up to the first slash in the branch name
    expect(slashBranchParsed?.gitRef).toBe("feature");

    const commitParsed = parseURL("https://github.com/user/repo/commit/abc123");
    // The pattern doesn't support /commit/ URLs, only /tree/
    expect(commitParsed?.gitRef).toBeUndefined();

    const tagParsed = parseURL(
      "https://github.com/user/repo/releases/tag/v1.0.0"
    );
    // The pattern doesn't support /releases/tag/ URLs, only /tree/
    expect(tagParsed?.gitRef).toBeUndefined();
  });

  it("should parse git repo URLs without protocol", () => {
    const parsed = parseURL("github.com/facebook/react");
    expect(parsed).toEqual({
      type: "git-repository",
      url: "https://github.com/facebook/react",
      normalizedUrl: "https://github.com/facebook/react",
      domain: "github.com",
      path: "/facebook/react",
      gitProvider: "github",
      gitHost: "github.com",
      gitOwner: "facebook",
      gitRepo: "react",
      gitRef: undefined,
    });
  });

  it("should normalize repository names", () => {
    const parsed = parseURL("https://github.com/user/repo.git");
    expect(parsed?.gitRepo).toBe("repo");
    // The normalizedUrl keeps the original URL
    expect(parsed?.normalizedUrl).toBe("https://github.com/user/repo.git");
  });

  it("should return null on invalid URLs", () => {
    expect(parseURL("file:///etc/passwd")).toBeNull();
    expect(parseURL("http://localhost")).toBeNull();
  });
});

describe("Cache Key Extraction", () => {
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
