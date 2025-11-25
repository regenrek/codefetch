import { describe, it, expect } from "vitest";
import {
  validateCachedContent,
  generateCacheKey,
} from "../src/cache/validation.js";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { writeFile, rm } from "node:fs/promises";

describe("cache validation", () => {
  it("returns false for missing content and expired entries", async () => {
    expect(await validateCachedContent(null as any)).toBe(false);

    const expired = {
      metadata: { expiresAt: new Date(Date.now() - 1000).toISOString() },
      content: { value: 1 },
      type: "other",
    };
    expect(await validateCachedContent(expired as any)).toBe(false);
  });

  it("validates filesystem content", async () => {
    const tempFile = join(tmpdir(), `cf-validate-${Date.now()}.txt`);
    await writeFile(tempFile, "content");

    const cached = {
      content: { path: tempFile },
      metadata: {},
      type: "filesystem",
    };

    expect(await validateCachedContent(cached as any)).toBe(true);
    await rm(tempFile, { force: true });
  });

  it("generates cache keys with options", () => {
    const key = generateCacheKey("source", {
      format: "json",
      maxTokens: 1000,
      tokenEncoder: "cl100k",
      extensions: [".ts", ".js"],
      excludeDirs: ["node_modules"],
    });

    expect(key).toContain("source");
    expect(key).toContain("format:json");
    expect(key).toContain("ext:.js,.ts");
    expect(key).toContain("exclude:node_modules");
  });
});
