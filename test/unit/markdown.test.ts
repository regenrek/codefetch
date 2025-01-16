import { describe, it, expect } from "vitest";
import { resolve, join } from "pathe";
import { generateMarkdown } from "../../src/index";
import { countTokens } from "../../src/token-counter";

const FIXTURE_DIR = resolve(__dirname, "../fixtures/codebase-test");
const UTILS_DIR = join(FIXTURE_DIR, "src/utils");

describe("generateMarkdown with chunk-based token limit", () => {
  it("enforces maxTokens by chunk-based reading", async () => {
    const MAX_TOKENS = 50;
    const files = [join(UTILS_DIR, "test1.ts"), join(UTILS_DIR, "test2.js")];

    const result = await generateMarkdown(files, {
      maxTokens: MAX_TOKENS,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
      tokenLimiter: "truncated",
    });

    const usedTokens = await countTokens(result, "simple");
    expect(usedTokens).toBeLessThanOrEqual(MAX_TOKENS);

    if (result.includes("test2.js")) {
      expect(result).toContain("test2.js");
      expect(result).toContain("[TRUNCATED]");
    } else {
      expect(result).toContain("[TRUNCATED]");
    }
  });

  it("generates markdown with line numbers by default", async () => {
    const files = [join(UTILS_DIR, "test1.ts")];

    const markdown = await generateMarkdown(files, {
      maxTokens: null,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
      disableLineNumbers: false,
    });
    expect(markdown).toMatch(/1 \| console\.log\("begin-of-file"\);/);
    expect(markdown).toMatch(/9 \| function handleFileChunks/);
    expect(markdown).toMatch(/144 \| console\.log\("end-of-file"\);/);
  });

  it("generates markdown without line numbers when disabled", async () => {
    const files = [join(UTILS_DIR, "test1.ts")];

    const markdown = await generateMarkdown(files, {
      maxTokens: null,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
      disableLineNumbers: true,
    });

    expect(markdown).not.toMatch(/1\|/);
    expect(markdown).not.toMatch(/2\|/);
    expect(markdown).toContain("function handleFileChunks");
  });

  it("handles project tree generation correctly", async () => {
    const files = [join(UTILS_DIR, "test1.ts")];

    const markdown = await generateMarkdown(files, {
      maxTokens: null,
      verbose: 0,
      projectTree: 2,
      tokenEncoder: "simple",
      disableLineNumbers: false,
    });

    expect(markdown).toContain("Project Structure:");
    expect(markdown).toMatch(/└── /);
    expect(markdown).toContain("test1.ts");
    expect(markdown).toMatch(/144 \| console\.log\("end-of-file"\);/);
  });

  it("respects token limits with project tree", async () => {
    const files = [join(UTILS_DIR, "test1.ts")];

    const markdown = await generateMarkdown(files, {
      maxTokens: 20,
      verbose: 0,
      projectTree: 2,
      tokenEncoder: "simple",
      disableLineNumbers: false,
    });

    const tokens = await countTokens(markdown, "simple");
    expect(tokens).toBeLessThanOrEqual(20);
  });
});

describe("generateMarkdown with token limiting strategies", () => {
  it("should process files sequentially until token limit in sequential mode", async () => {
    const files = [join(UTILS_DIR, "test1.ts"), join(UTILS_DIR, "test2.js")];

    const result = await generateMarkdown(files, {
      maxTokens: 100,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
      tokenLimiter: "sequential",
    });

    expect(result).toContain("test1.ts");
    const file1Lines =
      result.match(/console\.log\("begin-of-file"\);/g)?.length || 0;
    const file2Lines =
      result.match(/console\.log\("end-of-file"\);/g)?.length || 0;

    expect(file1Lines).toBeGreaterThan(0);
    expect(file2Lines).toBeLessThanOrEqual(file1Lines);
  });

  it("should distribute tokens evenly across files in truncated mode", async () => {
    const files = [join(UTILS_DIR, "test1.ts"), join(UTILS_DIR, "test2.js")];

    const result = await generateMarkdown(files, {
      maxTokens: 100,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
      tokenLimiter: "truncated",
    });

    expect(result).toContain("test1.ts");
    expect(result).toContain("test2.js");

    const file1Lines =
      result.match(/console\.log\("begin-of-file"\);/g)?.length || 0;
    const file2Lines =
      result.match(/console\.log\("end-of-file"\);/g)?.length || 0;

    const maxDiff = Math.abs(file1Lines - file2Lines);
    expect(maxDiff).toBeLessThanOrEqual(2);
  });

  it("should use truncated mode by default when no limiter is specified", async () => {
    const files = [join(UTILS_DIR, "test1.ts"), join(UTILS_DIR, "test2.js")];

    const result = await generateMarkdown(files, {
      maxTokens: 100,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
    });

    expect(result).toContain("test1.ts");
    expect(result).toContain("test2.js");

    const file1Lines =
      result.match(/console\.log\("begin-of-file"\);/g)?.length || 0;
    const file2Lines =
      result.match(/console\.log\("end-of-file"\);/g)?.length || 0;

    const maxDiff = Math.abs(file1Lines - file2Lines);
    expect(maxDiff).toBeLessThanOrEqual(2);
  });
});
