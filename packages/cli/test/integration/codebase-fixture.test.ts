import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { resolve, join } from "pathe";

const cliPath = resolve(__dirname, "../../dist/cli.mjs");
const FIXTURE_DIR = resolve(__dirname, "../fixtures/codebase-test");
const CODEFETCH_DIR = join(FIXTURE_DIR, "codefetch");

describe("Integration: codebase-test fixture", () => {
  beforeEach(() => {
    if (fs.existsSync(CODEFETCH_DIR)) {
      fs.rmSync(CODEFETCH_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(join(FIXTURE_DIR, "codefetch.config.mjs"))) {
      fs.unlinkSync(join(FIXTURE_DIR, "codefetch.config.mjs"));
    }
  });

  afterEach(() => {
    if (fs.existsSync(CODEFETCH_DIR)) {
      fs.rmSync(CODEFETCH_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(join(FIXTURE_DIR, "codefetch.config.mjs"))) {
      fs.unlinkSync(join(FIXTURE_DIR, "codefetch.config.mjs"));
    }
  });

  it("generates a markdown output by default", () => {
    const result = spawnSync("node", [cliPath, "-o", "fixture-output.md"], {
      cwd: FIXTURE_DIR,
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"],
    });

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Output written to");

    const outPath = join(CODEFETCH_DIR, "fixture-output.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    // Some basic checks
    expect(content).toContain("container.js");
    expect(content).toContain("button.js");
  });

  it("can limit to only .js files using -e", () => {
    const result = spawnSync(
      "node",
      [cliPath, "-o", "only-js.md", "-e", "js"],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"],
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Output written to");

    const outPath = join(CODEFETCH_DIR, "only-js.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    expect(content).toContain("app.js");
    expect(content).not.toContain("src/app.css");
    expect(content).not.toContain("public/logo.svg");
  });

  it("can skip subfolders with --exclude-dir", () => {
    const result = spawnSync(
      "node",
      [cliPath, "-o", "skip-components.md", "--exclude-dir", "src/components"],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"],
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Output written to");

    const outPath = join(CODEFETCH_DIR, "skip-components.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    expect(content).toContain("app.js");
    expect(content).toContain("app.css");
    expect(content).not.toContain("button.js");
    expect(content).not.toContain("header.js");
    expect(content).not.toContain("container.js");
  });

  it("can skip subfolders with --exclude-dir deep", () => {
    const result = spawnSync(
      "node",
      [
        cliPath,
        "-o",
        "skip-components.md",
        "--exclude-dir",
        "src/components/base",
      ],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"],
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Output written to");

    const outPath = join(CODEFETCH_DIR, "skip-components.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    expect(content).toContain("app.js");
    expect(content).toContain("app.css");
    expect(content).toContain("button.js");
    expect(content).toContain("header.js");
    expect(content).not.toContain("container.js");
  });

  it("respects an existing .codefetchignore if present", () => {
    const result = spawnSync(
      "node",
      [cliPath, "-o", "ignore-test.md", "-t", "2"],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"],
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Output written to");

    const outPath = join(CODEFETCH_DIR, "ignore-test.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    expect(content).not.toContain("ignore-this-file");
    expect(content).not.toContain("ignore-this-file-deep");
    // ensure tree was shown but still respected ignores
    expect(content).toMatch(/Project Structure:/);
  });

  it("can include ignored paths in project tree when requested", () => {
    const result = spawnSync(
      "node",
      [
        cliPath,
        "-o",
        "ignore-tree.md",
        "-t",
        "4",
        "--project-tree-skip-ignore-files",
      ],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"],
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Output written to");

    const outPath = join(CODEFETCH_DIR, "ignore-tree.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    expect(content).toMatch(/Project Structure:/);
    expect(content).toContain("ignore-this-file");
    expect(content).toContain("ignore-this-file-deep");
    // even though tree shows ignored files, content section should still exclude them
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    for (const block of codeBlocks) {
      expect(block).not.toContain("ignore-this-file");
      expect(block).not.toContain("ignore-this-file-deep");
    }
  });

  it("displays the project tree when using -t", () => {
    const result = spawnSync(
      "node",
      [cliPath, "-o", "with-tree.md", "-t", "2"],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"],
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Output written to");

    const outPath = join(CODEFETCH_DIR, "with-tree.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    expect(content).toMatch(/Project Structure:/);
    expect(content).toMatch(/└── /);
  });

  it("respects --disable-line-numbers flag", () => {
    const result = spawnSync(
      "node",
      [cliPath, "-o", "no-line-numbers.md", "--disable-line-numbers"],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"],
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Output written to");

    const outPath = join(CODEFETCH_DIR, "no-line-numbers.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    expect(content).not.toMatch(/^\d+\|/m);
    expect(content).toContain("container.js");
  });

  it("handles --include-files with mixed specific files and glob patterns", () => {
    const result = spawnSync(
      "node",
      [
        cliPath,
        "-o",
        "mixed-patterns.md",
        "--include-files",
        "src/components/button.js,src/utils/**/*",
        "-t",
        "3",
      ],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"],
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Output written to");

    const outPath = join(CODEFETCH_DIR, "mixed-patterns.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    // Should include the specific file
    expect(content).toContain("button.js");
    // Should include files from utils directory via glob pattern
    expect(content).toContain("test1.ts");
    expect(content).toContain("test2.js");
    // Should not include other files not matching the patterns
    expect(content).not.toContain("app.js");
    expect(content).not.toContain("header.js");
    // Project tree should reflect the filtered files
    expect(content).toMatch(/Project Structure:/);
    expect(content).toContain("button.js");
    expect(content).toContain("utils");
  });
});
