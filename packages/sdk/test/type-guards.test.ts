import { describe, it, expect } from "vitest";
import {
  isValidGitHubUrl,
  isValidRepoPath,
  isValidGitHubToken,
  isValidSemVer,
  createGitHubToken,
  createRepoPath,
  createGitHubUrl,
  isNotNull,
  isArray,
  isObject,
  isString,
  isNumber,
  assertDefined,
  assert,
} from "../src/type-guards.js";

describe("Type Guards Smoke Tests", () => {
  it("should validate GitHub URLs", () => {
    expect(isValidGitHubUrl("https://github.com/owner/repo")).toBe(true);
    expect(isValidGitHubUrl("https://github.com/owner/repo/tree/main")).toBe(
      true
    );
    expect(isValidGitHubUrl("https://example.com/owner/repo")).toBe(false);
    expect(isValidGitHubUrl("not-a-url")).toBe(false);
  });

  it("should validate repo paths", () => {
    expect(isValidRepoPath("owner/repo")).toBe(true);
    expect(isValidRepoPath("owner-name/repo-name")).toBe(true);
    expect(isValidRepoPath("owner/repo/extra")).toBe(false);
    expect(isValidRepoPath("justowner")).toBe(false);
  });

  it("should validate GitHub tokens", () => {
    // Classic token (40 char hex)
    expect(isValidGitHubToken("a".repeat(40))).toBe(true);

    // Fine-grained PAT
    expect(isValidGitHubToken("ghp_" + "a".repeat(36))).toBe(true);

    // Invalid tokens
    expect(isValidGitHubToken("invalid-token")).toBe(false);
    expect(isValidGitHubToken("ghp_short")).toBe(false);
  });

  it("should validate semantic versions", () => {
    expect(isValidSemVer("1.2.3")).toBe(true);
    expect(isValidSemVer("0.0.1")).toBe(true);
    expect(isValidSemVer("1.2")).toBe(false);
    expect(isValidSemVer("v1.2.3")).toBe(false);
  });

  it("should create branded types", () => {
    expect(() => createGitHubToken("a".repeat(40))).not.toThrow();
    expect(() => createGitHubToken("invalid")).toThrow();

    expect(() => createRepoPath("owner", "repo")).not.toThrow();
    expect(() => createRepoPath("", "repo")).toThrow();

    expect(() => createGitHubUrl("owner", "repo")).not.toThrow();
  });

  it("should check basic type guards", () => {
    expect(isNotNull("value")).toBe(true);
    expect(isNotNull(null)).toBe(false);
    expect(isNotNull(undefined)).toBe(false);

    expect(isArray([1, 2, 3])).toBe(true);
    expect(isArray("not array")).toBe(false);

    expect(isObject({ key: "value" })).toBe(true);
    expect(isObject([])).toBe(false);
    expect(isObject(null)).toBe(false);

    expect(isString("hello")).toBe(true);
    expect(isString(123)).toBe(false);

    expect(isNumber(123)).toBe(true);
    expect(isNumber("123")).toBe(false);
    expect(isNumber(Number.NaN)).toBe(false);
  });

  it("should assert defined values", () => {
    expect(() => assertDefined("value")).not.toThrow();
    expect(() => assertDefined(null)).toThrow();
    expect(() => assertDefined(undefined)).toThrow();
  });

  it("should assert conditions", () => {
    expect(() => assert(true)).not.toThrow();
    expect(() => assert(1 === 1)).not.toThrow();
    expect(() => assert(false)).toThrow();
    expect(() => assert(null)).toThrow();
  });
});
