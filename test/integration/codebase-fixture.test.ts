import {
  describe,
  it,
  beforeEach,
  afterEach,
  expect,
  beforeAll,
  vi,
  test,
} from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import consola from "consola";

const cliPath = path.resolve(__dirname, "../../dist/cli.mjs");
const FIXTURE_DIR = path.resolve(__dirname, "../fixtures/codebase-test");
const CODEFETCH_DIR = path.join(FIXTURE_DIR, "codefetch");

describe("Integration: codebase-test fixture", () => {
  beforeAll(() => {
    // consola.wrapAll();
  });
  beforeEach(() => {
    // Clean up codefetch directory before each test.
    if (fs.existsSync(CODEFETCH_DIR)) {
      fs.rmSync(CODEFETCH_DIR, { recursive: true, force: true });
    }

    consola.mockTypes(() => vi.fn());
  });

  afterEach(() => {
    if (fs.existsSync(CODEFETCH_DIR)) {
      fs.rmSync(CODEFETCH_DIR, { recursive: true, force: true });
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

    const outPath = path.join(CODEFETCH_DIR, "fixture-output.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    // Some basic checks
    expect(content).toContain("container.js");
    expect(content).toContain("button.js");
  });

  it("shows a warning or info if token-limit is exceeded (but doesn't truncate)", () => {
    const result = spawnSync("node", [cliPath, "--max-tokens", "5"], {
      cwd: FIXTURE_DIR,
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"],
    });

    console.log(result);

    expect(result.stderr).toContain("Token limit exceeded");

    const outPath = path.join(CODEFETCH_DIR, "codebase.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
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

    const outPath = path.join(CODEFETCH_DIR, "only-js.md");
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

    const outPath = path.join(CODEFETCH_DIR, "skip-components.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    expect(content).toContain("button.js");
    expect(content).toContain("header.js");
    expect(content).not.toContain("container.js");
  });

  it("respects an existing .codefetchignore if present", () => {
    const codefetchIgnorePath = path.join(FIXTURE_DIR, ".codefetchignore");
    const originalIgnore = fs.readFileSync(codefetchIgnorePath, "utf8");
    fs.appendFileSync(codefetchIgnorePath, "\nignore-this-file\n");

    try {
      const result = spawnSync(
        "node",
        [cliPath, "-o", "ignore-test.md", "--verbose", "1"],
        {
          cwd: FIXTURE_DIR,
          encoding: "utf8",
          stdio: ["inherit", "pipe", "pipe"],
        }
      );

      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Output written to");

      const outPath = path.join(CODEFETCH_DIR, "ignore-test.md");
      expect(fs.existsSync(outPath)).toBe(true);

      const content = fs.readFileSync(outPath, "utf8");
      expect(content).not.toContain("ignore-this-file");
    } finally {
      fs.writeFileSync(codefetchIgnorePath, originalIgnore, "utf8");
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

    const outPath = path.join(CODEFETCH_DIR, "with-tree.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    expect(content).toMatch(/Project Structure:/);
    expect(content).toMatch(/└── /);
  });

  it("generates a markdown output with token tracking in summary", () => {
    const result = spawnSync(
      "node",
      [cliPath, "-o", "fixture-output.md", "--token-encoder", "cl100k"],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"],
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Output written to");
    expect(result.stdout).toContain("Token Count Overview");

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
        stdio: ["inherit", "pipe", "pipe"],
      }
    );

    console.log("AA", result.stdout);

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("```");
    expect(result.stdout).toContain("Container.js");

    const outPath = path.join(CODEFETCH_DIR, "codebase.md");
    expect(fs.existsSync(outPath)).toBe(false);
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

    const outPath = path.join(CODEFETCH_DIR, "no-line-numbers.md");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    expect(content).not.toMatch(/^\d+\|/m);
    expect(content).toContain("Container.js");
  });
});
