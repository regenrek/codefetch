import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { generateMarkdown } from "../../src/index";
import { countTokens } from "../../src/token-counter";

const TEST_DIR = path.join(__dirname, "..", "__test__");

/**
 * We'll create two small files, but set a small maxToken limit,
 * expecting immediate truncation in the middle of the second file.
 */
describe("generateMarkdown with chunk-based token limit", () => {
  beforeEach(async () => {
    // Clean up
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    // Create a couple of test files
    fs.writeFileSync(
      path.join(TEST_DIR, "test1.ts"),
      "console.log('file1');\n".repeat(20)
    );
    fs.writeFileSync(
      path.join(TEST_DIR, "test2.js"),
      "console.log('file2');\n".repeat(20)
    );
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("enforces maxTokens by chunk-based reading", async () => {
    // Let's pick a small limit, e.g. 60 tokens total
    // (You must pick something that ensures partway truncation.)
    const MAX_TOKENS = 60;

    const files = [
      path.join(TEST_DIR, "test1.ts"),
      path.join(TEST_DIR, "test2.js"),
    ];

    const result = await generateMarkdown(files, {
      maxTokens: MAX_TOKENS,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple", // or cl100k, etc.
    });

    // The result should not exceed 60 tokens
    // We can do a quick sanity check by re-counting
    const usedTokens = countTokens(result, "simple");
    expect(usedTokens).toBeLessThanOrEqual(MAX_TOKENS);

    // The second file might appear partially or not at all,
    // depending on the chunk logic. We can check for "[TRUNCATED]"
    // or partial lines from test2.js:
    if (result.includes("test2.js")) {
      // We included at least the heading for test2.js. Possibly truncated lines
      // in the middle of that file. Either is acceptable, as long as we see
      // truncated indicator or we stop reading lines.
      expect(result).toContain("test2.js");
      expect(result).toContain("[TRUNCATED]");
    } else {
      // Means we truncated before the second file started
      expect(result).toContain("[TRUNCATED]");
    }
  });

  it("generates markdown with line numbers by default", async () => {
    const testFile = path.join(TEST_DIR, "test.ts");
    fs.writeFileSync(testFile, "console.log('test');\nconst x = 1;");

    const markdown = await generateMarkdown([testFile], {
      maxTokens: null,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
      disableLineNumbers: false,
    });

    expect(markdown).toMatch(/1\|console\.log\('test'\);/);
    expect(markdown).toMatch(/2\|const x = 1;/);
  });

  it("generates markdown without line numbers when disabled", async () => {
    const testFile = path.join(TEST_DIR, "test.ts");
    fs.writeFileSync(testFile, "console.log('test');\nconst x = 1;");

    const markdown = await generateMarkdown([testFile], {
      maxTokens: null,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
      disableLineNumbers: true,
    });

    expect(markdown).not.toMatch(/1\|/);
    expect(markdown).not.toMatch(/2\|/);
    expect(markdown).toContain("console.log('test');");
    expect(markdown).toContain("const x = 1;");
  });

  it("handles empty files correctly with line numbers disabled", async () => {
    const testFile = path.join(TEST_DIR, "empty.ts");
    fs.writeFileSync(testFile, "");

    const markdown = await generateMarkdown([testFile], {
      maxTokens: null,
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
      disableLineNumbers: true,
    });

    expect(markdown).toContain("empty.ts");
    expect(markdown).toContain("```");
    expect(markdown).toContain("```\n");
  });
});
