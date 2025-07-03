import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { collectFiles } from "../../src/index";
import ignore from "ignore";

const TEST_DIR = path.join(__dirname, "..", "__test__");

describe("collectFiles", () => {
  beforeEach(() => {
    // Create test directory and files
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(TEST_DIR, "test1.ts"), "test content");
    fs.writeFileSync(path.join(TEST_DIR, "test2.js"), "test content");
    fs.writeFileSync(path.join(TEST_DIR, ".gitignore"), "test1.ts");
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("should collect files with extension filter", async () => {
    const files = await collectFiles(TEST_DIR, {
      ig: ignore(),
      extensionSet: new Set([".ts"]),
      excludeFiles: null,
      includeFiles: null,
      excludeDirs: null,
      includeDirs: null,
      verbose: 0,
    });

    expect(files).toHaveLength(1);
    expect(files[0]).toContain("test1.ts");
  });

  it("should respect include/exclude patterns", async () => {
    const files = await collectFiles(TEST_DIR, {
      ig: ignore(),
      extensionSet: null,
      excludeFiles: ["test2*"],
      includeFiles: ["test*"],
      excludeDirs: null,
      includeDirs: null,
      verbose: 0,
    });

    expect(files).toHaveLength(1);
    expect(files[0]).toContain("test1.ts");
  });

  it("should respect directory filters", async () => {
    // Create a subdirectory
    const subDir = path.join(TEST_DIR, "subdir");
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, "test3.ts"), "test content");

    const files = await collectFiles(TEST_DIR, {
      ig: ignore(),
      extensionSet: null,
      excludeFiles: null,
      includeFiles: null,
      excludeDirs: ["subdir"],
      includeDirs: null,
      verbose: 0,
    });

    // We'll see test1.ts, test2.js, .gitignore
    expect(files.some((f: string) => f.endsWith("test1.ts"))).toBe(true);
    expect(files.some((f: string) => f.endsWith("test2.js"))).toBe(true);
    expect(files.some((f: string) => f.endsWith(".gitignore"))).toBe(true);
    // subdir/test3.ts is excluded
    expect(files.some((f: string) => f.endsWith("test3.ts"))).toBe(false);
  });

  it("should handle ignore patterns from the ig param", async () => {
    const ig = ignore().add("test1.ts");
    const files = await collectFiles(TEST_DIR, {
      ig,
      extensionSet: null,
      excludeFiles: null,
      includeFiles: null,
      excludeDirs: null,
      includeDirs: null,
      verbose: 0,
    });

    // test1.ts is ignored, so only test2.js and .gitignore remain
    expect(files.length).toBe(2);
    expect(files.every((f: string) => !f.includes("test1.ts"))).toBe(true);
  });

  it("should handle directories with special glob characters", async () => {
    // Create directories with special characters
    const specialDirs = [
      "routes(marketing)",
      "test[brackets]",
      "test{braces}",
      "test*star",
      "test?question",
    ];

    for (const dir of specialDirs) {
      const dirPath = path.join(TEST_DIR, dir);
      fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(path.join(dirPath, "file.ts"), "test content");
    }

    // Test including a directory with parentheses
    const files = await collectFiles(TEST_DIR, {
      ig: ignore(),
      extensionSet: null,
      excludeFiles: null,
      includeFiles: null,
      excludeDirs: null,
      includeDirs: [path.join(TEST_DIR, "routes(marketing)")],
      verbose: 0,
    });

    expect(files).toHaveLength(1);
    expect(files[0]).toContain("routes(marketing)");
    expect(files[0]).toContain("file.ts");
  });
});
