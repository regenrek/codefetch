import { describe, it, expect } from "vitest";
import {
  getDefaultConfig,
  resolveCodefetchConfig,
  mergeWithCliArgs,
} from "../src/config-worker";

describe("config-worker", () => {
  describe("getDefaultConfig", () => {
    it("should return default configuration for workers", () => {
      const config = getDefaultConfig();

      expect(config.extensions).toEqual([]);
      expect(config.excludeFiles).toEqual([]);
      expect(config.excludeDirs).toEqual([]);
      expect(config.includeDirs).toEqual([]);
      expect(config.verbose).toBe(0);
      expect(config.projectTree).toBe(0);
      expect(config.projectTreeSkipIgnoreFiles).toBe(false);
      expect(config.dryRun).toBe(false);
      expect(config.maxTokens).toBe(50_000);
      expect(config.tokenEncoder).toBe("cl100k");
      expect(config.disableLineNumbers).toBe(true);
      expect(config.defaultIgnore).toBe(true);
      expect(config.gitignore).toBe(false); // No file system access in Workers
      expect(config.tokenLimiter).toBe("truncated");
      expect(config.tokenCountOnly).toBe(false);
    });
  });

  describe("resolveCodefetchConfig", () => {
    it("should return defaults when no overrides provided", async () => {
      const config = await resolveCodefetchConfig();

      expect(config.maxTokens).toBe(50_000);
      expect(config.tokenEncoder).toBe("cl100k");
    });

    it("should merge overrides with defaults", async () => {
      const config = await resolveCodefetchConfig(undefined, {
        maxTokens: 100_000,
        verbose: 2,
      });

      expect(config.maxTokens).toBe(100_000);
      expect(config.verbose).toBe(2);
      expect(config.tokenEncoder).toBe("cl100k"); // Default preserved
    });

    it("should handle cwd parameter (ignored in workers)", async () => {
      const config = await resolveCodefetchConfig("/some/path", {
        maxTokens: 75_000,
      });

      expect(config.maxTokens).toBe(75_000);
    });
  });

  describe("mergeWithCliArgs", () => {
    it("should merge CLI args into config", () => {
      const config = getDefaultConfig();
      const merged = mergeWithCliArgs(config, {
        maxTokens: 200_000,
        extensions: [".ts", ".js"],
      });

      expect(merged.maxTokens).toBe(200_000);
      expect(merged.extensions).toEqual([".ts", ".js"]);
    });

    it("should override boolean values", () => {
      const config = getDefaultConfig();
      const merged = mergeWithCliArgs(config, {
        disableLineNumbers: false,
        projectTreeSkipIgnoreFiles: true,
      });

      expect(merged.disableLineNumbers).toBe(false);
      expect(merged.projectTreeSkipIgnoreFiles).toBe(true);
    });

    it("should replace arrays (not merge) for excludeDirs", () => {
      const config = getDefaultConfig();
      config.excludeDirs = ["node_modules"];

      const merged = mergeWithCliArgs(config, {
        excludeDirs: ["dist", "build"],
      });

      // Worker config replaces arrays, doesn't merge
      expect(merged.excludeDirs).toEqual(["dist", "build"]);
    });

    it("should handle undefined arrays", () => {
      const config = getDefaultConfig();
      const merged = mergeWithCliArgs(config, {});

      expect(merged.excludeDirs).toEqual([]);
      expect(merged.extensions).toEqual([]);
    });
  });
});
