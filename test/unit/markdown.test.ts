import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { generateMarkdown } from "../../src/index";

const TEST_DIR = path.join(__dirname, "..", "__test__");

describe("generateMarkdown", () => {
  beforeEach(async () => {
    // Clean up any existing test files first
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }

    // Create test directory and files
    fs.mkdirSync(TEST_DIR, { recursive: true });
    await Promise.all([
      fs.promises.writeFile(path.join(TEST_DIR, "test1.ts"), "test content 1"),
      fs.promises.writeFile(path.join(TEST_DIR, "test2.js"), "test content 2"),
    ]);
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("should generate a markdown string with file contents", async () => {
    const files = [
      path.join(TEST_DIR, "test1.ts"),
      path.join(TEST_DIR, "test2.js"),
    ];

    const markdown = await generateMarkdown(files, {
      maxTokens: null, // not enforced here
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
    });

    // generateMarkdown returns a string
    expect(typeof markdown).toBe("string");
    expect(markdown.length).toBeGreaterThan(0);

    // Check for file names and contents in the final string
    expect(markdown).toContain("test1.ts");
    expect(markdown).toContain("test2.js");
    expect(markdown).toContain("test content 1");
    expect(markdown).toContain("test content 2");
  });

  it("should include project tree if projectTree > 0", async () => {
    const files = [path.join(TEST_DIR, "test1.ts")];

    const markdown = await generateMarkdown(files, {
      maxTokens: null,
      verbose: 0,
      projectTree: 2, // request a tree
      tokenEncoder: "simple",
    });

    expect(markdown).toContain("Project Structure:");
    // the tree lines typically contain "├──" or "└──"
    expect(markdown).toMatch(/(├──|└──)/);
  });

  it("does not truncate the output for maxTokens (since not implemented)", async () => {
    // This confirms we do NOT do any cut-off inside generateMarkdown.
    const files = [
      path.join(TEST_DIR, "test1.ts"),
      path.join(TEST_DIR, "test2.js"),
    ];

    const markdown = await generateMarkdown(files, {
      maxTokens: 5, // ignored by generateMarkdown
      verbose: 0,
      projectTree: 0,
      tokenEncoder: "simple",
    });
    // Expect full content
    expect(markdown).toContain("test content 1");
    expect(markdown).toContain("test content 2");
  });
});
