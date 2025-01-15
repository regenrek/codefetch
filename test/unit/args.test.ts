import { describe, it, expect } from "vitest";
import { parseArgs } from "../../src/args";

describe("parseArgs", () => {
  it("should parse basic arguments", () => {
    const args = ["--output", "output.md", "--verbose", "2"];
    const result = parseArgs(args);

    expect(result).toMatchObject({
      output: "output.md",
      verbose: 2,
    });
  });

  it("should handle extensions correctly", () => {
    const args = ["-e", "ts,js"];
    const result = parseArgs(args);

    expect(result.extensions).toEqual([".ts", ".js"]);
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

  it("should handle multiple options together", () => {
    const args = [
      "-o",
      "output.md",
      "--disable-line-numbers",
      "--token-encoder",
      "cl100k",
      "-v",
      "2",
    ];
    const result = parseArgs(args);

    expect(result).toMatchObject({
      output: "output.md",
      disableLineNumbers: true,
      tokenEncoder: "cl100k",
      verbose: 2,
    });
  });
});
