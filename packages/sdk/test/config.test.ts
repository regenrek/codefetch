import { describe, test, expect, beforeEach, afterEach } from "vitest";
import {
  getDefaultConfig,
  resolveCodefetchConfig,
  mergeWithCliArgs,
} from "../src/config";
import type { TokenEncoder } from "../src/types";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

describe("SDK Config", () => {
  describe("getDefaultConfig", () => {
    test("should return default configuration", () => {
      const config = getDefaultConfig();

      expect(config).toBeDefined();
      expect(config.outputPath).toBe("codefetch");
      expect(config.outputFile).toBe("codebase.md");
      expect(config.maxTokens).toBe(999_000);
      expect(config.extensions).toBeUndefined(); // Not in default config
      expect(config.defaultIgnore).toBe(true);
      expect(config.gitignore).toBe(true);
      expect(config.tokenCountOnly).toBe(false);
      expect(config.verbose).toBe(1);
      expect(config.projectTree).toBe(2);
      expect(config.disableLineNumbers).toBe(false);
      expect(config.tokenEncoder).toBe("simple");
      expect(config.tokenLimiter).toBe("truncated");
      expect(config.defaultPromptFile).toBe("default.md");
      expect(config.defaultChat).toBe("https://chat.com");
      expect(config.format).toBe("markdown");
      expect(config.trackedModels).toEqual([
        "o3",
        "gemini-2.5-pro",
        "claude-sonnet-4",
        "claude-opus-4",
      ]);
    });

    test("should have all expected properties", () => {
      const config = getDefaultConfig();
      const expectedKeys = [
        "outputPath",
        "outputFile",
        "maxTokens",
        "defaultIgnore",
        "gitignore",
        "tokenCountOnly",
        "dryRun",
        "verbose",
        "projectTree",
        "disableLineNumbers",
        "tokenEncoder",
        "tokenLimiter",
        "defaultPromptFile",
        "defaultChat",
        "templateVars",
        "format",
        "trackedModels",
      ];

      for (const key of expectedKeys) {
        expect(config).toHaveProperty(key);
      }
    });
  });

  describe("resolveCodefetchConfig", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), "codefetch-test-"));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    test("should resolve output path relative to cwd", async () => {
      const config = getDefaultConfig();
      const resolved = await resolveCodefetchConfig(config, tempDir);

      expect(resolved.outputPath).toBe(join(tempDir, "codefetch"));
    });

    test("should resolve includeFiles paths", async () => {
      const config = {
        ...getDefaultConfig(),
        includeFiles: ["src/*.js", "lib/*.ts"],
      };

      const resolved = await resolveCodefetchConfig(config, tempDir);

      expect(resolved.includeFiles).toEqual([
        join(tempDir, "src/*.js"),
        join(tempDir, "lib/*.ts"),
      ]);
    });

    test("should resolve excludeFiles paths", async () => {
      const config = {
        ...getDefaultConfig(),
        excludeFiles: ["test/*.js", "*.spec.ts"],
      };

      const resolved = await resolveCodefetchConfig(config, tempDir);

      expect(resolved.excludeFiles).toEqual([
        join(tempDir, "test/*.js"),
        join(tempDir, "*.spec.ts"),
      ]);
    });

    test("should resolve includeDirs paths", async () => {
      const config = {
        ...getDefaultConfig(),
        includeDirs: ["src", "lib"],
      };

      const resolved = await resolveCodefetchConfig(config, tempDir);

      expect(resolved.includeDirs).toEqual([
        join(tempDir, "src"),
        join(tempDir, "lib"),
      ]);
    });

    test("should resolve excludeDirs paths", async () => {
      const config = {
        ...getDefaultConfig(),
        excludeDirs: ["node_modules", "dist"],
      };

      const resolved = await resolveCodefetchConfig(config, tempDir);

      expect(resolved.excludeDirs).toEqual([
        join(tempDir, "node_modules"),
        join(tempDir, "dist"),
      ]);
    });

    test("should preserve other config properties", async () => {
      const config = {
        ...getDefaultConfig(),
        maxTokens: 50_000,
        verbose: 3,
        tokenEncoder: "o200k" as TokenEncoder,
      };

      const resolved = await resolveCodefetchConfig(config, tempDir);

      expect(resolved.maxTokens).toBe(50_000);
      expect(resolved.verbose).toBe(3);
      expect(resolved.tokenEncoder).toBe("o200k");
    });
  });

  describe("mergeWithCliArgs", () => {
    test("should override config with CLI args", () => {
      const config = getDefaultConfig();
      const cliArgs = {
        maxTokens: 100_000,
        verbose: 3,
        disableLineNumbers: true,
        extensions: [".md", ".txt"],
      };

      const merged = mergeWithCliArgs(config, cliArgs);

      expect(merged.maxTokens).toBe(100_000);
      expect(merged.verbose).toBe(3);
      expect(merged.disableLineNumbers).toBe(true);
      expect(merged.extensions).toEqual([".md", ".txt"]);
      // Non-overridden values should remain
      expect(merged.outputPath).toBe("codefetch");
    });

    test("should handle undefined CLI args", () => {
      const config = getDefaultConfig();
      const cliArgs = {
        maxTokens: undefined,
        verbose: undefined,
        extensions: undefined,
      };

      const merged = mergeWithCliArgs(config, cliArgs);

      // mergeWithCliArgs adds array fields and spreads cliArgs, so undefined values override
      expect(merged.maxTokens).toBeUndefined();
      expect(merged.verbose).toBeUndefined();
      expect(merged.extensions).toBeUndefined();
      // But it adds empty arrays for include/exclude fields
      expect(merged.includeFiles).toEqual([]);
      expect(merged.excludeFiles).toEqual([]);
      expect(merged.includeDirs).toEqual([]);
      expect(merged.excludeDirs).toEqual([]);
      // Other values should remain from config
      expect(merged.outputPath).toBe("codefetch");
      expect(merged.tokenEncoder).toBe("simple");
    });

    test("should handle partial CLI args", () => {
      const config = getDefaultConfig();
      const cliArgs = {
        tokenCountOnly: true,
        dryRun: true,
      };

      const merged = mergeWithCliArgs(config, cliArgs);

      expect(merged.tokenCountOnly).toBe(true);
      expect(merged.dryRun).toBe(true);
      expect(merged.maxTokens).toBe(config.maxTokens);
    });

    test("should override templateVars from CLI args", () => {
      const config = {
        ...getDefaultConfig(),
        templateVars: {
          EXISTING: "value",
          OVERRIDE: "old",
        },
      };

      const cliArgs = {
        templateVars: {
          OVERRIDE: "new",
          NEW_VAR: "new value",
        },
      };

      const merged = mergeWithCliArgs(config, cliArgs);

      // mergeWithCliArgs uses spread operator, so cliArgs completely replaces templateVars
      expect(merged.templateVars).toEqual({
        OVERRIDE: "new",
        NEW_VAR: "new value",
      });
    });

    test("should handle all boolean flags", () => {
      const config = getDefaultConfig();
      const cliArgs = {
        defaultIgnore: false,
        gitignore: false,
        tokenCountOnly: true,
        dryRun: true,
        disableLineNumbers: true,
      };

      const merged = mergeWithCliArgs(config, cliArgs);

      expect(merged.defaultIgnore).toBe(false);
      expect(merged.gitignore).toBe(false);
      expect(merged.tokenCountOnly).toBe(true);
      expect(merged.dryRun).toBe(true);
      expect(merged.disableLineNumbers).toBe(true);
    });

    test("should validate tokenEncoder values", () => {
      const config = getDefaultConfig();
      const validEncoders = ["simple", "p50k", "o200k", "cl100k"];

      for (const encoder of validEncoders) {
        const merged = mergeWithCliArgs(config, {
          tokenEncoder: encoder as TokenEncoder,
        });
        expect(merged.tokenEncoder).toBe(encoder);
      }
    });

    test("should validate tokenLimiter values", () => {
      const config = getDefaultConfig();
      const validLimiters = ["sequential", "truncated"];

      for (const limiter of validLimiters) {
        const merged = mergeWithCliArgs(config, {
          tokenLimiter: limiter as any,
        });
        expect(merged.tokenLimiter).toBe(limiter);
      }
    });

    test("should merge and deduplicate array fields", () => {
      const config = {
        ...getDefaultConfig(),
        includeFiles: ["src/*.js", "lib/*.ts"],
        excludeDirs: ["node_modules"],
      };

      const cliArgs = {
        includeFiles: ["lib/*.ts", "test/*.js"], // lib/*.ts is duplicate
        excludeDirs: ["dist", "node_modules"], // node_modules is duplicate
      };

      const merged = mergeWithCliArgs(config, cliArgs);

      // Arrays should be merged and deduplicated
      expect(merged.includeFiles).toEqual([
        "src/*.js",
        "lib/*.ts",
        "test/*.js",
      ]);
      expect(merged.excludeDirs).toEqual(["node_modules", "dist"]);
    });
  });
});
