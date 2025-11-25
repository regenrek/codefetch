import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { Argv } from "mri";

// Create mock functions
const mockCopyToClipboard = vi.fn().mockResolvedValue(undefined);
const mockOpenBrowser = vi.fn().mockResolvedValue(undefined);
const mockBuildChatUrl = vi.fn(
  (url: string, model: string, prompt?: string) => {
    const baseUrl = url.replace(/\/+$/, "");
    const params = new URLSearchParams({ model });
    if (prompt) {
      params.set("prompt", prompt);
    }
    // Return URL without https:// prefix (as per requirements)
    return `${baseUrl}/?${params.toString()}`;
  }
);
const mockSpinner = vi.fn(() => ({
  start: vi.fn(),
  message: vi.fn(),
  stop: vi.fn(),
}));

const createRawArgs = (overrides: Partial<Argv> = {}): Argv =>
  ({
    _: [],
    ...overrides,
  }) as Argv;

// Mock the clipboard and browser utilities
vi.mock("../../src/utils/clipboard", () => ({
  copyToClipboard: mockCopyToClipboard,
}));

vi.mock("../../src/utils/browser", () => ({
  openBrowser: mockOpenBrowser,
  buildChatUrl: mockBuildChatUrl,
}));

// Mock @clack/prompts spinner
vi.mock("@clack/prompts", () => ({
  spinner: mockSpinner,
}));

describe("open command", () => {
  let tempDir: string;
  let originalCwd: string;
  let originalArgv: string[];
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Clear all mocks before each test
    mockCopyToClipboard.mockClear();
    mockOpenBrowser.mockClear();
    mockBuildChatUrl.mockClear();
    mockSpinner.mockClear();

    tempDir = await mkdtemp(join(tmpdir(), "codefetch-open-test-"));
    originalCwd = process.cwd();
    originalArgv = [...process.argv];

    // Create a minimal test project
    await writeFile(join(tempDir, "index.ts"), 'export const hello = "world";');
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "test-project" })
    );

    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.argv = originalArgv;
    consoleSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should copy codebase to clipboard and open browser", async () => {
    // Set up argv for open command
    process.argv = ["node", "cli.ts", "open"];
    process.chdir(tempDir);

    const openCommand = (await import("../../src/commands/open")).default;
    await openCommand(createRawArgs());

    // Verify clipboard was called
    expect(mockCopyToClipboard).toHaveBeenCalled();
    const clipboardContent = mockCopyToClipboard.mock.calls[0][0];
    expect(clipboardContent).toContain("index.ts");

    // Verify browser was opened with correct URL format (no https://, includes prompt)
    const expectedUrl =
      "chatgpt.com/?model=gpt-5-1-pro&prompt=Your+codebase+is+in+your+clipboard+just+paste+it+and+remove+this+line";
    expect(mockOpenBrowser).toHaveBeenCalledWith(expectedUrl);
  });

  it("should use custom chat-url and chat-model", async () => {
    process.argv = [
      "node",
      "cli.ts",
      "open",
      "--chat-url",
      "claude.ai",
      "--chat-model",
      "claude-3.5-sonnet",
    ];
    process.chdir(tempDir);

    const openCommand = (await import("../../src/commands/open")).default;
    await openCommand(createRawArgs());

    expect(mockBuildChatUrl).toHaveBeenCalledWith(
      "claude.ai",
      "claude-3.5-sonnet",
      "Your codebase is in your clipboard just paste it and remove this line"
    );
    expect(mockOpenBrowser).toHaveBeenCalled();
  });

  it("should skip browser with --no-browser flag", async () => {
    process.argv = ["node", "cli.ts", "open", "--no-browser"];
    process.chdir(tempDir);

    const openCommand = (await import("../../src/commands/open")).default;
    await openCommand(createRawArgs());

    // Clipboard should still be called
    expect(mockCopyToClipboard).toHaveBeenCalled();

    // Browser should NOT be called
    expect(mockOpenBrowser).not.toHaveBeenCalled();
  });

  it("should display custom chat-prompt message", async () => {
    const customPrompt = "Custom instruction message";

    process.argv = [
      "node",
      "cli.ts",
      "open",
      "--chat-prompt",
      customPrompt,
      "--no-browser",
    ];
    process.chdir(tempDir);

    const openCommand = (await import("../../src/commands/open")).default;
    await openCommand(createRawArgs());

    // Check that the custom prompt appears in console output
    const allLogs = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(allLogs).toContain(customPrompt);
  });

  it("should respect codefetch options like -e extension", async () => {
    // Create additional files
    await writeFile(join(tempDir, "script.js"), "console.log('js');");

    process.argv = ["node", "cli.ts", "open", "-e", ".ts", "--no-browser"];
    process.chdir(tempDir);

    const openCommand = (await import("../../src/commands/open")).default;
    await openCommand(createRawArgs());

    const clipboardContent = mockCopyToClipboard.mock.calls[0][0];

    // Should include .ts files
    expect(clipboardContent).toContain("index.ts");

    // Should NOT include .js files (filtered by -e .ts)
    expect(clipboardContent).not.toContain("script.js");
  });
});
