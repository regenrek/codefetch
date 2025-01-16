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

  it("handles prompt within token limits", async () => {
    const MAX_TOKENS = 100;
    const PROMPT = "This is a test prompt for the codebase analysis.";
    const files = [join(UTILS_DIR, "test1.ts")];

    const result = await generateMarkdown(files, {
      maxTokens: MAX_TOKENS,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
      tokenLimiter: "truncated",
      prompt: PROMPT,
    });

    const usedTokens = await countTokens(result, "simple");
    expect(usedTokens).toBeLessThanOrEqual(MAX_TOKENS);
    expect(result).toContain(PROMPT);
    expect(result).toContain("test1.ts");
  });

  it("skips prompt when it exceeds token limit", async () => {
    const MAX_TOKENS = 10;
    const PROMPT =
      "This is a very long prompt that should exceed the token limit and be skipped.";
    const files = [join(UTILS_DIR, "test1.ts")];

    const result = await generateMarkdown(files, {
      maxTokens: MAX_TOKENS,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
      tokenLimiter: "truncated",
      prompt: PROMPT,
    });

    const usedTokens = await countTokens(result, "simple");
    expect(usedTokens).toBeLessThanOrEqual(MAX_TOKENS);
    expect(result).not.toContain(PROMPT);
  });

  it("includes prompt before project tree", async () => {
    const PROMPT = "Analysis prompt:";
    const files = [join(UTILS_DIR, "test1.ts")];

    const result = await generateMarkdown(files, {
      maxTokens: null,
      verbose: 0,
      projectTree: 2,
      tokenEncoder: "simple",
      prompt: PROMPT,
    });

    const promptIndex = result.indexOf(PROMPT);
    const treeIndex = result.indexOf("Project Structure:");

    expect(promptIndex).toBeGreaterThanOrEqual(0);
    expect(treeIndex).toBeGreaterThanOrEqual(0);
    expect(promptIndex).toBeLessThan(treeIndex);
  });

  it("respects token limits with prompt and project tree", async () => {
    const MAX_TOKENS = 50;
    const PROMPT = "Analysis:";
    const files = [join(UTILS_DIR, "test1.ts")];

    const result = await generateMarkdown(files, {
      maxTokens: MAX_TOKENS,
      verbose: 0,
      projectTree: 2,
      tokenEncoder: "simple",
      prompt: PROMPT,
    });

    const usedTokens = await countTokens(result, "simple");
    expect(usedTokens).toBeLessThanOrEqual(MAX_TOKENS);
    expect(result).toContain(PROMPT);
    expect(result).toContain("Project Structure:");
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

  it("should include prompt in sequential mode token calculation", async () => {
    const PROMPT = "Sequential analysis:";
    const files = [join(UTILS_DIR, "test1.ts"), join(UTILS_DIR, "test2.js")];

    const result = await generateMarkdown(files, {
      maxTokens: 100,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
      tokenLimiter: "sequential",
      prompt: PROMPT,
    });

    expect(result).toContain(PROMPT);
    expect(result).toContain("test1.ts");
    const usedTokens = await countTokens(result, "simple");
    expect(usedTokens).toBeLessThanOrEqual(100);
  });

  it("should include prompt in truncated mode token distribution", async () => {
    const PROMPT = "Truncated analysis:";
    const files = [join(UTILS_DIR, "test1.ts"), join(UTILS_DIR, "test2.js")];

    const result = await generateMarkdown(files, {
      maxTokens: 100,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
      tokenLimiter: "truncated",
      prompt: PROMPT,
    });

    expect(result).toContain(PROMPT);
    expect(result).toContain("test1.ts");
    expect(result).toContain("test2.js");
    const usedTokens = await countTokens(result, "simple");
    expect(usedTokens).toBeLessThanOrEqual(100);
  });
});
