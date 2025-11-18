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

  it("should parse disable-line-numbers flag", () => {
    const args = ["--disable-line-numbers"];
    const result = parseArgs(args);

    expect(result.disableLineNumbers).toBe(true);
  });

  it("should default disable-line-numbers to false when not specified", () => {
    const args = ["-o", "output.md"];
    const result = parseArgs(args);

    expect(result.disableLineNumbers).toBe(false);
  });

  it("should parse no-summary flag", () => {
    const args = ["--no-summary"];
    const result = parseArgs(args);

    expect(result.noSummary).toBe(true);
  });

  it("should handle multiple options together", () => {
    const args = [
      "-o",
      "output.md",
      "--disable-line-numbers",
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
      disableLineNumbers: true,
      maxPages: 50,
      maxDepth: 3,
      tokenEncoder: "cl100k",
      verbose: 2,
    });
  });
});
