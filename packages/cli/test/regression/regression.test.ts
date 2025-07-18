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
    expect(found.some((f: string) => f.endsWith("file1.ts"))).toBe(true);
    expect(found.some((f: string) => f.endsWith("file4.ts"))).toBe(true);
    expect(found.length).toBe(2);
  });

  it("parseArgs merges defaults with user input", () => {
    const res = parseArgs(["node", "script.js", "-o", "myOut.md", "-e", "js"]);
    expect(res.outputFile).toBe("myOut.md");
    expect(res.extensions).toEqual([".js"]);
    expect(res.verbose).toBe(1); // default
  });

  it("generateMarkdown returns full content (no token-limit enforcement)", async () => {
    const files = [
      path.join(TEST_DIR, "file1.ts"),
      path.join(TEST_DIR, "nested", "file4.ts"),
    ];
    const markdown = await generateMarkdown(files, {
      maxTokens: null, // not used for truncation
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
    });

    expect(typeof markdown).toBe("string");
    // We should see console.log('ts1'); and console.log('nested ts');
    expect(markdown).toContain("console.log('ts1');");
    expect(markdown).toContain("console.log('nested ts');");
  });

  it("handles different token encoders correctly (just doesn't truncate)", async () => {
    const found = await collectFiles(TEST_DIR, {
      ig: ignore(),
      extensionSet: new Set([".ts"]),
      excludeFiles: null,
      includeFiles: null,
      excludeDirs: null,
      includeDirs: null,
      verbose: 0,
    });

    const markdown = await generateMarkdown(found, {
      maxTokens: null,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "cl100k",
    });

    expect(typeof markdown).toBe("string");
    expect(markdown).toContain("console.log('ts1');");
  }, 10_000); // 10 second timeout

  it("parseArgs handles new token encoder option", () => {
    const res = parseArgs(["node", "script.js", "--token-encoder", "cl100k"]);
    expect(res.tokenEncoder).toBe("cl100k");
  });

  it("handles disable-line-numbers consistently across different file types", async () => {
    // Create files with different extensions
    fs.writeFileSync(
      path.join(TEST_DIR, "test.ts"),
      "console.log('ts');\nconst x = 1;"
    );
    fs.writeFileSync(
      path.join(TEST_DIR, "test.js"),
      "console.log('js');\nlet y = 2;"
    );

    const files = [
      path.join(TEST_DIR, "test.ts"),
      path.join(TEST_DIR, "test.js"),
    ];

    const markdown = await generateMarkdown(files, {
      maxTokens: null,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
      disableLineNumbers: true,
    });

    // Should not contain line numbers for any file
    expect(markdown).not.toMatch(/\d+\|/);
    // Should contain the actual code
    expect(markdown).toContain("console.log('ts');");
    expect(markdown).toContain("console.log('js');");
    expect(markdown).toContain("const x = 1;");
    expect(markdown).toContain("let y = 2;");
  });

  it("parseArgs handles token limiter option", () => {
    const sequential = parseArgs([
      "node",
      "script.js",
      "--token-limiter",
      "sequential",
    ]);
    expect(sequential.tokenLimiter).toBe("sequential");

    const truncated = parseArgs([
      "node",
      "script.js",
      "--token-limiter",
      "truncated",
    ]);
    expect(truncated.tokenLimiter).toBe("truncated");

    // Default case - no token limiter specified
    const defaultCase = parseArgs(["node", "script.js"]);
    expect(defaultCase.tokenLimiter).toBeUndefined();
  });

  it("parseArgs validates token limiter option", () => {
    expect(() =>
      parseArgs(["node", "script.js", "--token-limiter", "invalid"])
    ).toThrow("Invalid token limiter. Must be one of: sequential, truncated");
  });

  it("handles token limiter with max tokens", () => {
    const args = parseArgs([
      "node",
      "script.js",
      "--max-tokens",
      "500",
      "--token-limiter",
      "sequential",
    ]);
    expect(args.maxTokens).toBe(500);
    expect(args.tokenLimiter).toBe("sequential");
  });
});
