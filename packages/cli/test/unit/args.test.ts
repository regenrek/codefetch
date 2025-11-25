import { describe, it, expect } from "vitest";
import { parseArgs } from "../../src/args";

describe("parseArgs", () => {
  it("should parse basic arguments", () => {
    const args = ["--output", "output.md", "--verbose", "2"];
    const result = parseArgs(args);

    expect(result).toMatchObject({
      outputFile: "output.md",
      verbose: 2,
    });
  });

  it("should strip codefetch/ prefix from output file", () => {
    // Test with codefetch/ prefix
    expect(parseArgs(["-o", "codefetch/codebase.md"]).outputFile).toBe(
      "codebase.md"
    );
    expect(parseArgs(["--output", "codefetch/myfile.md"]).outputFile).toBe(
      "myfile.md"
    );

    // Test with ./codefetch/ prefix
    expect(parseArgs(["-o", "./codefetch/output.md"]).outputFile).toBe(
      "output.md"
    );

    // Test with nested path after codefetch/
    expect(parseArgs(["-o", "codefetch/subfolder/file.md"]).outputFile).toBe(
      "subfolder/file.md"
    );

    // Test without codefetch/ prefix (should remain unchanged)
    expect(parseArgs(["-o", "myoutput.md"]).outputFile).toBe("myoutput.md");
    expect(parseArgs(["-o", "folder/file.md"]).outputFile).toBe(
      "folder/file.md"
    );

    // Test edge case: file named codefetch in another directory
    expect(parseArgs(["-o", "other/codefetch/file.md"]).outputFile).toBe(
      "other/codefetch/file.md"
    );
  });

  it("should handle extensions correctly", () => {
    expect(parseArgs(["-e", "ts,js,png"]).extensions).toEqual([
      ".ts",
      ".js",
      ".png",
    ]);
    expect(parseArgs(["-e", ".ts,.js,.png,.txt"]).extensions).toEqual([
      ".ts",
      ".js",
      ".png",
      ".txt",
    ]);

    // Should throw for invalid formats
    expect(() => parseArgs(["-e", " ts,js "])).toThrow(
      "Invalid extension format"
    );
    expect(() => parseArgs(["-e", "ts, js"])).toThrow(
      "Invalid extension format"
    );
    expect(() => parseArgs(["-e", ".ts, .js"])).toThrow(
      "Invalid extension format"
    );

    expect(parseArgs(["--extension", ".ts,.js"]).extensions).toEqual([
      ".ts",
      ".js",
    ]);
  });

  it("should parse token encoder", () => {
    const args = ["--token-encoder", "cl100k"];
    const result = parseArgs(args);

    expect(result.tokenEncoder).toBe("cl100k");
  });

  it("should throw on invalid token encoder", () => {
    const args = ["--token-encoder", "invalid"];
    expect(() => parseArgs(args)).toThrow();
  });

  it("should handle include/exclude patterns", () => {
    const args = [
      "--include-files",
      "src/**/*.ts",
      "--exclude-files",
      "test/**/*.ts",
    ];
    const result = parseArgs(args);

    expect(result.includeFiles).toContain("src/**/*.ts");
    expect(result.excludeFiles).toContain("test/**/*.ts");
  });

  it("should parse enable-line-numbers flag", () => {
    const args = ["--enable-line-numbers"];
    const result = parseArgs(args);

    expect(result.disableLineNumbers).toBe(false);
  });

  it("should parse tracked-models option into an array", () => {
    const args = ["--tracked-models", "gpt-4o,claude-3.5-sonnet"];
    const result = parseArgs(args);

    expect(result.trackedModels).toEqual(["gpt-4o", "claude-3.5-sonnet"]);
  });

  it("should default disableLineNumbers to true when not specified (line numbers disabled by default)", () => {
    const args = ["-o", "output.md"];
    const result = parseArgs(args);

    expect(result.disableLineNumbers).toBe(true);
  });

  it("should parse inline prompt string", () => {
    const args = ["-p", "Review this code for security issues"];
    const result = parseArgs(args);

    expect(result.inlinePrompt).toBe("Review this code for security issues");
    expect(result.defaultPromptFile).toBeUndefined();
  });

  it("should parse built-in prompt name", () => {
    const args = ["-p", "fix"];
    const result = parseArgs(args);

    expect(result.defaultPromptFile).toBe("fix");
    expect(result.inlinePrompt).toBeUndefined();
  });

  it("should parse prompt file path", () => {
    const args = ["--prompt", "custom-prompt.md"];
    const result = parseArgs(args);

    expect(result.defaultPromptFile).toBe("custom-prompt.md");
    expect(result.inlinePrompt).toBeUndefined();
  });

  it("should parse no-summary flag", () => {
    const args = ["--no-summary"];
    const result = parseArgs(args);

    expect(result.noSummary).toBe(true);
  });

  it("should treat --stdout as dry-run with no summary and verbose 0", () => {
    const args = ["--stdout"];
    const result = parseArgs(args);

    expect(result.stdout).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.noSummary).toBe(true);
    expect(result.verbose).toBe(0);
  });

  it("should handle multiple options together", () => {
    const args = [
      "-o",
      "output.md",
      "--enable-line-numbers",
      "--max-pages",
      "50",
      "--max-depth",
      "3",
      "--token-encoder",
      "cl100k",
      "-v",
      "2",
    ];
    const result = parseArgs(args);

    expect(result).toMatchObject({
      outputFile: "output.md",
      disableLineNumbers: false, // --enable-line-numbers sets this to false
      maxPages: 50,
      maxDepth: 3,
      tokenEncoder: "cl100k",
      verbose: 2,
    });
  });

  it("should parse --copy flag", () => {
    const args = ["--copy"];
    const result = parseArgs(args);

    expect(result.copy).toBe(true);
  });

  it("should default copy to false when not specified", () => {
    const args = ["-o", "output.md"];
    const result = parseArgs(args);

    expect(result.copy).toBe(false);
  });
});
