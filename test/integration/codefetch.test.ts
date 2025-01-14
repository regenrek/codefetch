import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fsp } from "node:fs";
import { join } from "pathe";
import { loadCodefetchConfig, mergeWithCliArgs } from "../../src/config";
import { parseArgs } from "../../src/args";
import { generateMarkdown } from "../../src/markdown";
import { collectFiles } from "../../src/files";
import ignore from "ignore";

describe("codefetch integration", () => {
  const TEST_DIR = "test-project";

  beforeAll(async () => {
    await fsp.mkdir(TEST_DIR, { recursive: true });
    await fsp.writeFile(join(TEST_DIR, "test.ts"), 'console.log("test")');
    await fsp.writeFile(join(TEST_DIR, ".gitignore"), "node_modules\n*.log");
  });

  afterAll(async () => {
    await fsp.rm(TEST_DIR, { recursive: true, force: true });
  });

  it("should process files and generate markdown using loadCodefetchConfig + cli merges", async () => {
    // Load config
    const config = await loadCodefetchConfig(TEST_DIR);

    // Parse CLI args
    const args = parseArgs(["--verbose", "1"]);

    // Merge config
    const finalConfig = mergeWithCliArgs(config, args);

    // Collect files
    const ig = ignore();
    const files = await collectFiles(TEST_DIR, {
      ig,
      extensionSet: new Set([".ts"]),
      excludeFiles: null,
      includeFiles: null,
      excludeDirs: null,
      includeDirs: null,
      verbose: finalConfig.verbose,
    });

    // Generate markdown
    const markdown = await generateMarkdown(files, {
      maxTokens: finalConfig.maxTokens, // not truncated, just pass it
      verbose: finalConfig.verbose,
      projectTree: finalConfig.projectTree,
      tokenEncoder: finalConfig.tokenEncoder,
    });

    expect(typeof markdown).toBe("string");
    expect(markdown).toContain("test.ts");
    expect(markdown).toContain('console.log("test")');
  });
});
