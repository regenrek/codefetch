import { describe, it, expect } from "vitest";
import {
  isCloudflareWorker,
  getCacheSizeLimit,
  isGitAvailable,
} from "../src/env";

// We need to test the env module which detects runtime environment
describe("env detection", () => {
  it("should detect Node.js environment (not Cloudflare Worker)", () => {
    // In Node.js test environment, we should NOT be in a Cloudflare Worker
    expect(isCloudflareWorker).toBe(false);
  });

  it("should return appropriate cache size limit for Node.js", () => {
    const limit = getCacheSizeLimit();

    // Node.js default is 100 MB
    expect(limit).toBe(100 * 1024 * 1024);
  });

  it("should indicate git is available in Node.js", () => {
    expect(isGitAvailable()).toBe(true);
  });

  it("should export environment detection values and functions", () => {
    expect(typeof isCloudflareWorker).toBe("boolean");
    expect(typeof getCacheSizeLimit).toBe("function");
    expect(typeof isGitAvailable).toBe("function");
  });
});
