import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { generateMarkdown } from "../../src/index";

const TEST_DIR = path.join(__dirname, "..", "__test__");

describe("generateMarkdown", () => {
  beforeEach(() => {
    // Create test directory and files
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(TEST_DIR, "test1.ts"), "test content 1");
    fs.writeFileSync(path.join(TEST_DIR, "test2.js"), "test content 2");
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("should generate markdown with file contents", async () => {
    const outputPath = path.join(TEST_DIR, "output.md");
    const files = [
      path.join(TEST_DIR, "test1.ts"),
      path.join(TEST_DIR, "test2.js"),
    ];

    const tokens = await generateMarkdown(files, {
      outputPath,
      maxTokens: null,
      verbose: false,
    });

    expect(tokens).toBeGreaterThan(0);
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = fs.readFileSync(outputPath, "utf8");
    expect(content).toContain("test1.ts");
    expect(content).toContain("test2.js");
    expect(content).toContain("test content 1");
    expect(content).toContain("test content 2");
  });

  it("should respect maxTokens limit", async () => {
    const outputPath = path.join(TEST_DIR, "output.md");
    const files = [path.join(TEST_DIR, "test1.ts")];

    const tokens = await generateMarkdown(files, {
      outputPath,
      maxTokens: 2,
      verbose: false,
    });

    expect(tokens).toBeLessThanOrEqual(2);
    const content = fs.readFileSync(outputPath, "utf8");
    expect(content.split("\n").length).toBeLessThan(10);
  });

  it("should write to stdout when no output path", async () => {
    const files = [path.join(TEST_DIR, "test1.ts")];
    const tokens = await generateMarkdown(files, {
      outputPath: null,
      maxTokens: null,
      verbose: false,
    });

    expect(tokens).toBeGreaterThan(0);
  });
});
