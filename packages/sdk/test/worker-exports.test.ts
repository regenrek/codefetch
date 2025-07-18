import { describe, it, expect } from "vitest";

describe("Worker Module Exports Smoke Tests", () => {
  it("should export all expected APIs from worker module", async () => {
    const workerModule = await import("../src/worker.js");

    // Core utilities
    expect(workerModule.getDefaultConfig).toBeDefined();
    expect(workerModule.resolveCodefetchConfig).toBeDefined();
    expect(workerModule.mergeWithCliArgs).toBeDefined();
    expect(workerModule.countTokens).toBeDefined();
    expect(workerModule.VALID_PROMPTS).toBeDefined();
    expect(workerModule.VALID_ENCODERS).toBeDefined();
    expect(workerModule.VALID_LIMITERS).toBeDefined();

    // Markdown utilities
    expect(workerModule.generateMarkdownFromContent).toBeDefined();

    // Web fetch
    expect(workerModule.fetchFromWeb).toBeDefined();

    // Types (checking at least one exists to verify exports work)
    expect(workerModule.FetchResultImpl).toBeDefined();

    // Prompts
    expect(workerModule.prompts).toBeDefined();
    expect(workerModule.codegenPrompt).toBeDefined();
    expect(workerModule.fixPrompt).toBeDefined();
    expect(workerModule.improvePrompt).toBeDefined();
    expect(workerModule.testgenPrompt).toBeDefined();

    // Tree utilities
    expect(workerModule.filesToTree).toBeDefined();
    expect(workerModule.treeToFiles).toBeDefined();
    expect(workerModule.findNodeByPath).toBeDefined();
    expect(workerModule.walkTree).toBeDefined();
    expect(workerModule.calculateTreeMetrics).toBeDefined();
    expect(workerModule.sortTree).toBeDefined();
    expect(workerModule.filterTree).toBeDefined();

    // Environment detection
    expect(workerModule.isCloudflareWorker).toBeDefined();
    expect(workerModule.getCacheSizeLimit).toBeDefined();

    // Utility functions
    expect(workerModule.detectLanguage).toBeDefined();

    // Error classes
    expect(workerModule.CodefetchError).toBeDefined();
    expect(workerModule.GitHubError).toBeDefined();
    expect(workerModule.TokenLimitError).toBeDefined();
    expect(workerModule.ParseError).toBeDefined();
    expect(workerModule.NetworkError).toBeDefined();
    expect(workerModule.ConfigError).toBeDefined();
    expect(workerModule.CacheError).toBeDefined();
    expect(workerModule.URLValidationError).toBeDefined();
    expect(workerModule.isCodefetchError).toBeDefined();
    expect(workerModule.isGitHubError).toBeDefined();
    expect(workerModule.isTokenLimitError).toBeDefined();
    expect(workerModule.wrapError).toBeDefined();

    // Streaming APIs
    expect(workerModule.streamGitHubFiles).toBeDefined();
    expect(workerModule.createMarkdownStream).toBeDefined();
    expect(workerModule.createTransformStream).toBeDefined();
    expect(workerModule.collectStream).toBeDefined();
    expect(workerModule.filterStream).toBeDefined();
    expect(workerModule.mapStream).toBeDefined();

    // HTML to Markdown
    expect(workerModule.htmlToMarkdown).toBeDefined();

    // GitHub tarball
    expect(workerModule.streamGitHubTarball).toBeDefined();

    // Cache integration
    expect(workerModule.fetchFromWebCached).toBeDefined();
    expect(workerModule.deleteFromCache).toBeDefined();
    expect(workerModule.clearCache).toBeDefined();
    expect(workerModule.createCacheStorage).toBeDefined();
    expect(workerModule.withCache).toBeDefined();

    // Migration helpers
    expect(workerModule.migrateFromV1).toBeDefined();
    expect(workerModule.compat).toBeDefined();
    expect(workerModule.generateMigrationGuide).toBeDefined();
    expect(workerModule.needsMigration).toBeDefined();
    expect(workerModule.autoMigrateCode).toBeDefined();

    // Type guards
    expect(workerModule.isValidGitHubUrl).toBeDefined();
    expect(workerModule.isValidRepoPath).toBeDefined();
    expect(workerModule.isValidGitHubToken).toBeDefined();
    expect(workerModule.isValidSemVer).toBeDefined();
    expect(workerModule.createGitHubToken).toBeDefined();
    expect(workerModule.createRepoPath).toBeDefined();
    expect(workerModule.createGitHubUrl).toBeDefined();
    expect(workerModule.isNotNull).toBeDefined();
    expect(workerModule.isArray).toBeDefined();
    expect(workerModule.isObject).toBeDefined();
    expect(workerModule.isString).toBeDefined();
    expect(workerModule.isNumber).toBeDefined();
    expect(workerModule.assertDefined).toBeDefined();
    expect(workerModule.assert).toBeDefined();
    expect(workerModule.exhaustiveCheck).toBeDefined();

    // Check that Node-specific exports are NOT included
    expect((workerModule as any).collectFiles).toBeUndefined();
    expect((workerModule as any).fetchFiles).toBeUndefined();
    expect((workerModule as any).fetch).toBeUndefined(); // The non-worker fetch
  });

  it("should export proper TypeScript types", async () => {
    // This test ensures TypeScript compilation works with the new types
    // The actual type checking happens at compile time
    const workerModule = await import("../src/worker.js");

    // Just verify we can access type constructors/functions that use the types
    const config = workerModule.getDefaultConfig();
    expect(config).toBeDefined();
    expect(config.tokenEncoder).toBeDefined();

    // Test that error constructors work
    const error = new workerModule.CodefetchError("Test", "TEST");
    expect(error.code).toBe("TEST");
  });
});
