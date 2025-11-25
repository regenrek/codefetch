import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "pathe";

const cliPath = resolve(__dirname, "../../dist/cli.mjs");
const FIXTURE_DIR = resolve(__dirname, "../fixtures/prompt-test");
const CODEFETCH_DIR = join(FIXTURE_DIR, "codefetch");
const PROMPTS_DIR = join(CODEFETCH_DIR, "prompts");

describe("Integration: prompt functionality", () => {
  beforeEach(async () => {
    // Clean up and create necessary directories
    if (existsSync(CODEFETCH_DIR)) {
      await rm(CODEFETCH_DIR, { recursive: true, force: true });
    }
    await mkdir(PROMPTS_DIR, { recursive: true });

    // Create a package.json to make it a project root
    await writeFile(
      join(FIXTURE_DIR, "package.json"),
      JSON.stringify({ name: "test-project", version: "1.0.0" })
    );

    // Create a test default prompt
    await writeFile(
      join(PROMPTS_DIR, "default.md"),
      "Default Prompt\n{{MESSAGE}}\n{{CURRENT_CODEBASE}}"
    );

    // Create a test custom prompt
    await writeFile(
      join(PROMPTS_DIR, "custom.md"),
      "Custom: {{MESSAGE}}\nAuthor: {{AUTHOR}}\n{{CURRENT_CODEBASE}}"
    );
  });

  afterEach(async () => {
    if (existsSync(CODEFETCH_DIR)) {
      await rm(CODEFETCH_DIR, { recursive: true, force: true });
    }
    if (existsSync(join(FIXTURE_DIR, "package.json"))) {
      await rm(join(FIXTURE_DIR, "package.json"));
    }
  });

  it("uses default prompt with -p flag", async () => {
    const result = spawnSync("node", [cliPath, "-p", "-o", "prompt-test.md"], {
      cwd: FIXTURE_DIR,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    expect(result.stderr).toBe("");
    const content = await readFile(
      join(CODEFETCH_DIR, "prompt-test.md"),
      "utf8"
    );
    expect(content).toContain("Default Prompt");
  });

  it("handles MESSAGE variable from command line", async () => {
    const result = spawnSync(
      "node",
      [cliPath, "-p", "fix", "fix this issue", "-o", "fix-test.md"],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    expect(result.stderr).toBe("");
    const content = await readFile(join(CODEFETCH_DIR, "fix-test.md"), "utf8");
    expect(content).toContain("fix this issue");
  });

  it("handles custom variables with --var", async () => {
    const result = spawnSync(
      "node",
      [
        cliPath,
        "-p",
        "custom.md",
        "--var",
        "MESSAGE=test message",
        "--var",
        "AUTHOR=John",
        "-o",
        "vars-test.md",
      ],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    expect(result.stderr).toBe("");
    const content = await readFile(join(CODEFETCH_DIR, "vars-test.md"), "utf8");
    expect(content).toContain("test message");
    expect(content).toContain("Author: John");
  });

  it("uses built-in fix prompt", async () => {
    const result = spawnSync(
      "node",
      [cliPath, "-p", "fix", "fix issue", "-o", "builtin-test.md"],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    expect(result.stderr).toBe("");
    const content = await readFile(
      join(CODEFETCH_DIR, "builtin-test.md"),
      "utf8"
    );
    expect(content).toContain("Current Issue:");
    expect(content).toContain("fix issue");
  });

  it("treats unknown prompt names as inline prompts", () => {
    // With inline prompt support, any string that's not a built-in prompt
    // or a file path is treated as an inline prompt
    const result = spawnSync(
      "node",
      [cliPath, "-p", "Review this code", "-o", "inline-prompt-test.md"],
      {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    expect(result.status).toBe(0);
    expect(existsSync(join(CODEFETCH_DIR, "inline-prompt-test.md"))).toBe(true);

    // Verify the inline prompt is in the output
    const content = readFileSync(
      join(CODEFETCH_DIR, "inline-prompt-test.md"),
      "utf8"
    );
    expect(content).toContain("Review this code");
  });
});
