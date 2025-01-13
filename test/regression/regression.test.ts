import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { parseArgs, collectFiles, generateMarkdown } from "../../src/index";
import ignore from "ignore";

describe("Regression Tests", () => {
  const TEST_DIR = path.join(__dirname, "..", "__regression_fixture__");

  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    // Create some nested dirs and files of varied extensions
    fs.writeFileSync(path.join(TEST_DIR, "file1.ts"), "console.log('ts1');");
    fs.writeFileSync(path.join(TEST_DIR, "file2.js"), "console.log('js2');");
    fs.writeFileSync(path.join(TEST_DIR, "file3.txt"), "hello txt");
    fs.mkdirSync(path.join(TEST_DIR, "nested"), { recursive: true });
    fs.writeFileSync(
      path.join(TEST_DIR, "nested", "file4.ts"),
      "console.log('nested ts');"
    );
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("collectFiles includes only specified extensions", async () => {
    const found = await collectFiles(TEST_DIR, {
      ig: ignore(),
      extensionSet: new Set([".ts"]),
      excludeFiles: null,
      includeFiles: null,
      excludeDirs: null,
      includeDirs: null,
      verbose: 0,
    });
    // Should find file1.ts and nested/file4.ts
    expect(found.some((f) => f.endsWith("file1.ts"))).toBe(true);
    expect(found.some((f) => f.endsWith("file4.ts"))).toBe(true);
    expect(found.length).toBe(2);
  });

  it("parseArgs merges defaults with user input", () => {
    const res = parseArgs(["node", "script.js", "-o", "myOut.md", "-e", "js"]);
    expect(res.output).toBe("myOut.md");
    expect(res.extensions).toEqual([".js"]);
    expect(res.verbose).toBe(1); // default
  });

  it("generateMarkdown can limit tokens properly", async () => {
    const outFile = path.join(TEST_DIR, "out.md");
    const files = [
      path.join(TEST_DIR, "file1.ts"),
      path.join(TEST_DIR, "nested", "file4.ts"),
    ];
    const tokens = await generateMarkdown(files, {
      outputPath: outFile,
      maxTokens: 4,
      verbose: 0,
    });
    // Should cut off quickly
    expect(tokens).toBeLessThanOrEqual(4);
    expect(fs.existsSync(outFile)).toBe(true);
    const content = fs.readFileSync(outFile, "utf8");
    expect(content.split("\n").length).toBeLessThan(15);
  });

  it("handles different token encoders correctly", async () => {
    const found = await collectFiles(TEST_DIR, {
      ig: ignore(),
      extensionSet: new Set([".ts"]),
      excludeFiles: null,
      includeFiles: null,
      excludeDirs: null,
      includeDirs: null,
      verbose: 0,
    });

    const outFile = path.join(TEST_DIR, "out.md");
    const tokens = await generateMarkdown(found, {
      outputPath: outFile,
      maxTokens: null,
      verbose: 0,
      tokenEncoder: "cl100k",
    });

    expect(tokens).toBeGreaterThan(0);
    expect(fs.existsSync(outFile)).toBe(true);
  });

  it("parseArgs handles new token encoder option", () => {
    const res = parseArgs(["node", "script.js", "--token-encoder", "cl100k"]);
    expect(res.tokenEncoder).toBe("cl100k");
  });
});
