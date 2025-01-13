import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const cliPath = path.resolve(__dirname, "../../dist/index.mjs");
const FIXTURE_DIR = path.resolve(__dirname, "../fixtures/codebase-test");
const CODEFETCH_DIR = path.join(FIXTURE_DIR, "codefetch");

describe("Integration: codebase-test fixture", () => {
  beforeEach(() => {
    // Clean up codefetch directory before each test.
    if (fs.existsSync(CODEFETCH_DIR)) {
      fs.rmSync(CODEFETCH_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Optionally remove codefetch artifacts after each test
    if (fs.existsSync(CODEFETCH_DIR)) {
      fs.rmSync(CODEFETCH_DIR, { recursive: true, force: true });
    }
  });

  it("generates a markdown output by default", () => {
    const result = spawnSync("node", [cliPath, "-o", "fixture-output.md"], {
      cwd: FIXTURE_DIR,
      encoding: "utf8",
    });

    expect(result.stderr).toBe("");
    expect(result.stdout).toMatch(/Output written to/);

    const outPath = path.join(CODEFETCH_DIR, "fixture-output.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    // Some basic checks
    expect(content).toContain("Container.js");
    expect(content).toContain("Button.js");
  });

  it("respects --max-tokens option", () => {
    const result = spawnSync("node", [cliPath, "--max-tokens", "5"], {
      cwd: FIXTURE_DIR,
      encoding: "utf8",
    });
    // If we set --max-tokens 5, codefetch likely stops early
    expect(result.stdout.split("\n").length).toBeLessThan(50);
  });

  it("can limit to only .js files using -e", () => {
    const outFile = "only-js.md";
    const result = spawnSync("node", [cliPath, "-o", outFile, "-e", "js"], {
      cwd: FIXTURE_DIR,
      encoding: "utf8",
    });

    expect(result.stderr).toBe("");
    const outPath = path.join(CODEFETCH_DIR, outFile);
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    // We should NOT see App.css or logo.svg in the snippet
    expect(content).toContain("app.js");
    expect(content).not.toContain("app.css");
    expect(content).not.toContain("logo.svg");
  });

  it("can skip subfolders with --exclude-dir", () => {
    // Suppose we skip the entire `components` folder
    const outFile = "skip-components.md";
    const result = spawnSync(
      "node",
      [cliPath, "-o", outFile, "--exclude-dir", "src/components"],
      { cwd: FIXTURE_DIR, encoding: "utf8" }
    );

    expect(result.stderr).toBe("");
    const outPath = path.join(CODEFETCH_DIR, outFile);
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");

    expect(content).toContain("button.js");
    expect(content).toContain("header.js");

    expect(content).not.toContain("container.js");
  });

  it("respects an existing .codefetchignore if present", () => {
    // Temporarily add a line to .codefetchignore that ignores 'ignore-this-file'
    const codefetchIgnorePath = path.join(FIXTURE_DIR, ".codefetchignore");
    const originalIgnore = fs.readFileSync(codefetchIgnorePath, "utf8");
    fs.appendFileSync(codefetchIgnorePath, "\nignore-this-file\n");

    try {
      const outFile = "ignore-test.md";
      const result = spawnSync(
        "node",
        [cliPath, "-o", outFile, "--verbose", "1"],
        { cwd: FIXTURE_DIR, encoding: "utf8" }
      );

      expect(result.stderr).toBe("");
      const outPath = path.join(CODEFETCH_DIR, outFile);
      expect(fs.existsSync(outPath)).toBe(true);

      const content = fs.readFileSync(outPath, "utf8");
      // "ignore-this-file" is in the fixture; it should be skipped now.
      expect(content).not.toContain("ignore-this-file");
    } finally {
      // Restore original .codefetchignore
      fs.writeFileSync(codefetchIgnorePath, originalIgnore, "utf8");
    }
  });

  it("displays the project tree when using -t", () => {
    const outFile = "with-tree.md";
    const result = spawnSync("node", [cliPath, "-o", outFile, "-t", "2"], {
      cwd: FIXTURE_DIR,
      encoding: "utf8",
    });

    expect(result.stderr).toBe("");
    const outPath = path.join(CODEFETCH_DIR, outFile);
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    // Should see a "Project Structure:" block in the output
    expect(content).toMatch(/Project Structure:/);
    // and some lines like "├──" or "└──" for the tree output
    expect(content).toMatch(/└── /);
  });

  it("generates a markdown output with token tracking", () => {
    const result = spawnSync(
      "node",
      [cliPath, "-o", "fixture-output.md", "--token-encoder", "cl100k"],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Your token count:");
    expect(result.stdout).toContain("Max input tokens for LLMs:");

    const outPath = path.join(CODEFETCH_DIR, "fixture-output.md");
    expect(fs.existsSync(outPath)).toBe(true);
  });

  it("handles dry run mode correctly", () => {
    const result = spawnSync(
      "node",
      [cliPath, "--dry-run", "--token-encoder", "cl100k"],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
      }
    );

    expect(result.stderr).toBe("");
    // Should output to stdout instead of file
    expect(result.stdout).toContain("```");
    expect(result.stdout).toContain("Container.js");

    // Should not create output file
    expect(fs.existsSync(path.join(CODEFETCH_DIR, "codebase.md"))).toBe(false);
  });
});
