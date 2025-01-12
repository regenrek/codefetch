import { describe, it, expect } from "vitest";
import { parseArgs } from "../../src/args";

describe("parseArgs", () => {
  it("parses output file", () => {
    const args = ["node", "script.js", "-o", "output.md"];
    const result = parseArgs(args);
    expect(result.output).toBe("output.md");
  });

  it("parses max tokens", () => {
    const args = ["node", "script.js", "-tok", "1000"];
    const result = parseArgs(args);
    expect(result.maxTokens).toBe(1000);
  });

  it("parses extensions", () => {
    const args = ["node", "script.js", "-e", "ts,js"];
    const result = parseArgs(args);
    expect(result.extensions).toEqual([".ts", ".js"]);
  });

  it("parses verbose flag", () => {
    const args = ["node", "script.js", "-v"];
    const result = parseArgs(args);
    expect(result.verbose).toBe(true);
  });

  it("parses include files", () => {
    const args = ["node", "script.js", "-if", "file1.ts,file2.ts"];
    const result = parseArgs(args);
    expect(result.includeFiles).toEqual(["file1.ts", "file2.ts"]);
  });

  it("parses exclude files", () => {
    const args = ["node", "script.js", "-ef", "test.ts,spec.ts"];
    const result = parseArgs(args);
    expect(result.excludeFiles).toEqual(["test.ts", "spec.ts"]);
  });

  it("parses include directories", () => {
    const args = ["node", "script.js", "-id", "src,lib"];
    const result = parseArgs(args);
    expect(result.includeDirs).toEqual(["src", "lib"]);
  });

  it("parses exclude directories", () => {
    const args = ["node", "script.js", "-ed", "test,dist"];
    const result = parseArgs(args);
    expect(result.excludeDirs).toEqual(["test", "dist"]);
  });

  it("parses verbose level", () => {
    const args = ["node", "script.js", "-v", "2"];
    const result = parseArgs(args);
    expect(result.verbose).toBe(2);
  });

  it("defaults to verbose level 1 when no level specified", () => {
    const args = ["node", "script.js", "-v"];
    const result = parseArgs(args);
    expect(result.verbose).toBe(1);
  });

  it("ignores invalid verbose levels", () => {
    const args = ["node", "script.js", "-v", "3"];
    const result = parseArgs(args);
    expect(result.verbose).toBe(1);
  });
});
