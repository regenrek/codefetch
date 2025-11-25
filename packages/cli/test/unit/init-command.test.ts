import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";
import initCommand from "../../src/commands/init";

describe("init command", () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "codefetch-cli-init-"));
    process.chdir(tempDir);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  test("creates default config, ignore file, and prompts when run non-interactively", async () => {
    await initCommand({ default: true });

    const configPath = join(tempDir, "codefetch.config.mjs");
    const ignorePath = join(tempDir, ".codefetchignore");
    const promptPath = join(tempDir, "codefetch", "prompts", "default.md");

    const config = await readFile(configPath, "utf8");
    const ignore = await readFile(ignorePath, "utf8");
    const prompt = await readFile(promptPath, "utf8");

    expect(config).toContain("defaultPromptFile");
    expect(ignore).toContain("test/");
    expect(prompt.length).toBeGreaterThan(0);
  });
});
