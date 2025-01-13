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

    expect(files).toHaveLength(3); // test1.ts, test2.js, .gitignore
    expect(files.every((f) => !f.includes("subdir"))).toBe(true);
  });

  it("should handle ignore patterns", async () => {
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

    expect(files).toHaveLength(2); // test2.js and .gitignore
    expect(files.every((f) => !f.includes("test1.ts"))).toBe(true);
  });
});
