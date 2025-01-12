import { describe, it, expect, vi } from "../_setup";
import { parseArgs } from "../../src";

describe("parseArgs", () => {
  it("should parse output file argument", () => {
    const args = parseArgs(["-o", "output.md"]);
    expect(args.output).toBe("output.md");
  });

  it("should parse max tokens argument", () => {
    const args = parseArgs(["--max-tokens", "1000"]);
    expect(args.maxTokens).toBe(1000);
  });

  it("should parse file extensions", () => {
    const args = parseArgs(["-e", ".ts,.js"]);
    expect(args.extensions).toEqual([".ts", ".js"]);
  });

  it("should handle verbose flag", () => {
    const args = parseArgs(["-v"]);
    expect(args.verbose).toBe(true);
  });

  it("should parse include/exclude patterns", () => {
    const args = parseArgs([
      "--include-files",
      "src/**/*",
      "--exclude-files",
      "node_modules/**",
      "--include-dir",
      "src",
      "--exclude-dir",
      "dist",
    ]);
    expect(args.includeFiles).toEqual(["src/**/*"]);
    expect(args.excludeFiles).toEqual(["node_modules/**"]);
    expect(args.includeDirs).toEqual(["src"]);
    expect(args.excludeDirs).toEqual(["dist"]);
  });

  it("should handle multiple arguments together", () => {
    const args = parseArgs(["-o", "out.md", "-e", ".ts,.js", "-v"]);
    expect(args.output).toBe("out.md");
    expect(args.extensions).toEqual([".ts", ".js"]);
    expect(args.verbose).toBe(true);
  });

  it("should handle equals syntax for patterns", () => {
    const args = parseArgs([
      "--include-files=src/**/*",
      "--exclude-files=node_modules/**",
      "--include-dir=src",
      "--exclude-dir=dist",
    ]);
    expect(args.includeFiles).toEqual(["src/**/*"]);
    expect(args.excludeFiles).toEqual(["node_modules/**"]);
    expect(args.includeDirs).toEqual(["src"]);
    expect(args.excludeDirs).toEqual(["dist"]);
  });

  it("should handle help flag", () => {
    const mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const mockConsoleLog = vi
      .spyOn(console, "log")
      .mockImplementation(() => {});

    parseArgs(["-h"]);

    expect(mockExit).toHaveBeenCalledWith(0);
    expect(mockConsoleLog).toHaveBeenCalled();

    mockExit.mockRestore();
    mockConsoleLog.mockRestore();
  });
});
