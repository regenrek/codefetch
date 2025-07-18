import { describe, it, expect } from "vitest";
import {
  CodefetchError,
  GitHubError,
  TokenLimitError,
  ParseError,
  NetworkError,
  ConfigError,
  CacheError,
  URLValidationError,
  isCodefetchError,
  isGitHubError,
  isTokenLimitError,
  wrapError,
} from "../src/errors.js";

describe("Error Classes Smoke Tests", () => {
  it("should create CodefetchError", () => {
    const error = new CodefetchError("Test error", "TEST_CODE");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CodefetchError);
    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_CODE");
    expect(error.name).toBe("CodefetchError");
  });

  it("should create GitHubError", () => {
    const error = new GitHubError("API failed", 404, 100);

    expect(error).toBeInstanceOf(GitHubError);
    expect(error.status).toBe(404);
    expect(error.rateLimitRemaining).toBe(100);
  });

  it("should create TokenLimitError", () => {
    const error = new TokenLimitError(1000, 1500, ["file1.ts", "file2.ts"]);

    expect(error).toBeInstanceOf(TokenLimitError);
    expect(error.limit).toBe(1000);
    expect(error.used).toBe(1500);
    expect(error.files).toHaveLength(2);
  });

  it("should create ParseError", () => {
    const error = new ParseError("Parse failed", "test.ts", 10, 5);

    expect(error).toBeInstanceOf(ParseError);
    expect(error.filePath).toBe("test.ts");
    expect(error.line).toBe(10);
    expect(error.column).toBe(5);
  });

  it("should create NetworkError", () => {
    const error = new NetworkError("Connection failed", "https://example.com");

    expect(error).toBeInstanceOf(NetworkError);
    expect(error.url).toBe("https://example.com");
  });

  it("should create ConfigError", () => {
    const error = new ConfigError("Invalid config", "config.json", "maxTokens");

    expect(error).toBeInstanceOf(ConfigError);
    expect(error.configPath).toBe("config.json");
    expect(error.invalidField).toBe("maxTokens");
  });

  it("should create CacheError", () => {
    const error = new CacheError("Cache write failed", "write", "test-key");

    expect(error).toBeInstanceOf(CacheError);
    expect(error.operation).toBe("write");
    expect(error.key).toBe("test-key");
  });

  it("should create URLValidationError", () => {
    const error = new URLValidationError(
      "Invalid URL",
      "not-a-url",
      "Invalid format"
    );

    expect(error).toBeInstanceOf(URLValidationError);
    expect(error.url).toBe("not-a-url");
    expect(error.reason).toBe("Invalid format");
  });

  it("should check error types with type guards", () => {
    const codefetchError = new CodefetchError("Test", "TEST");
    const githubError = new GitHubError("Test", 404);
    const tokenError = new TokenLimitError(100, 200, []);

    expect(isCodefetchError(codefetchError)).toBe(true);
    expect(isGitHubError(githubError)).toBe(true);
    expect(isTokenLimitError(tokenError)).toBe(true);

    expect(isGitHubError(codefetchError)).toBe(false);
    expect(isTokenLimitError(githubError)).toBe(false);
  });

  it("should wrap unknown errors", () => {
    const originalError = new Error("Original error");
    const wrapped = wrapError(originalError);

    expect(wrapped).toBeInstanceOf(CodefetchError);
    expect(wrapped.message).toBe("Original error");

    const stringError = wrapError("String error");
    expect(stringError).toBeInstanceOf(CodefetchError);
    expect(stringError.message).toBe("String error");
  });
});
