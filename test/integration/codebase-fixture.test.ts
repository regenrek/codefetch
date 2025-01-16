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
    // we use t=0 here because if we show the tree the ignore will be shown in the tree
    const result = spawnSync(
      "node",
      [cliPath, "-o", "ignore-test.md", "-t", "0"],
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
});
