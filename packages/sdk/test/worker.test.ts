import { expect, test, describe } from "vitest";
import { isCloudflareWorker, getCacheSizeLimit } from "../src/env.js";

describe("Worker environment detection", () => {
  test("should detect non-Worker environment in tests", () => {
    // In test environment, we're not in a Worker
    expect(isCloudflareWorker).toBe(false);
  });

  test("should return appropriate cache limits", () => {
    const limit = getCacheSizeLimit();
    // In non-Worker environment, should be 100MB
    expect(limit).toBe(100 * 1024 * 1024);
  });
});

describe("Worker exports", () => {
  test("should export Worker-safe APIs", async () => {
    // Dynamically import to test the exports
    const workerModule = await import("../src/worker.js");

    // Check core exports exist
    expect(workerModule.fetchFromWeb).toBeDefined();
    expect(workerModule.countTokens).toBeDefined();
    expect(workerModule.htmlToMarkdown).toBeDefined();
    expect(workerModule.generateMarkdown).toBeDefined();

    // Check that Node-specific exports are NOT included
    expect((workerModule as any).collectFiles).toBeUndefined();
    expect((workerModule as any).fetchFiles).toBeUndefined();
  });
});
