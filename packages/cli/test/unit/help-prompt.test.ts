import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { printHelp } from "../../src/help-prompt";

describe("help-prompt", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should print help message with all options", () => {
    printHelp();

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const helpText = consoleSpy.mock.calls[0][0];

    // Check for main sections
    expect(helpText).toContain("Usage: codefetch");
    expect(helpText).toContain("Commands:");
    expect(helpText).toContain("Options:");
    expect(helpText).toContain("Git Repository Options:");
    expect(helpText).toContain("Web Crawling Options:");
    expect(helpText).toContain("Examples:");
    expect(helpText).toContain("Open Command");
  });

  it("should include open command documentation", () => {
    printHelp();
    const helpText = consoleSpy.mock.calls[0][0];

    expect(helpText).toContain("open");
    expect(helpText).toContain("--chat-url");
    expect(helpText).toContain("--chat-model");
    expect(helpText).toContain("--no-browser");
    expect(helpText).toContain("codefetch open");
  });

  it("should include all main options", () => {
    printHelp();
    const helpText = consoleSpy.mock.calls[0][0];

    // Core options
    expect(helpText).toContain("-o, --output");
    expect(helpText).toContain("--dir");
    expect(helpText).toContain("--max-tokens");
    expect(helpText).toContain("-e, --extension");
    expect(helpText).toContain("--include-files");
    expect(helpText).toContain("--exclude-files");
    expect(helpText).toContain("-v, --verbose");
    expect(helpText).toContain("-t, --project-tree");
    expect(helpText).toContain("--enable-line-numbers");
    expect(helpText).toContain("-p, --prompt");
    expect(helpText).toContain("--copy");
  });

  it("should include git repository options", () => {
    printHelp();
    const helpText = consoleSpy.mock.calls[0][0];

    expect(helpText).toContain("--url");
    expect(helpText).toContain("--no-cache");
    expect(helpText).toContain("--cache-ttl");
    expect(helpText).toContain("--branch");
    expect(helpText).toContain("--no-api");
    expect(helpText).toContain("--github-token");
  });

  it("should include web crawling options", () => {
    printHelp();
    const helpText = consoleSpy.mock.calls[0][0];

    expect(helpText).toContain("--max-pages");
    expect(helpText).toContain("--max-depth");
    expect(helpText).toContain("--ignore-robots");
    expect(helpText).toContain("--ignore-cors");
  });

  it("should include inline prompt examples", () => {
    printHelp();
    const helpText = consoleSpy.mock.calls[0][0];

    expect(helpText).toContain("Use inline prompt");
    expect(helpText).toContain('codefetch -p "Review this code');
  });
});
