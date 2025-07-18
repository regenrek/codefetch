import { describe, it, expect } from "vitest";
import {
  migrateFromV1,
  compat,
  generateMigrationGuide,
  needsMigration,
  autoMigrateCode,
} from "../src/migration.js";

describe("Migration Helpers Smoke Tests", () => {
  it("should migrate from v1 format", () => {
    const oldResult = {
      root: {
        name: "root",
        type: "directory",
        children: [
          {
            name: "file.ts",
            path: "file.ts",
            type: "file",
            content: "export default {}",
          },
        ],
      },
      url: "https://github.com/owner/repo",
    };

    const migrated = migrateFromV1(oldResult);

    expect(migrated).toBeDefined();
    expect(migrated.root).toBeDefined();
    expect(migrated.metadata).toBeDefined();
    expect(migrated.metadata.source).toBe("https://github.com/owner/repo");
  });

  it("should provide compatibility layer", () => {
    const root = {
      name: "root",
      path: "",
      type: "directory" as const,
      children: [],
    };

    const legacyResult = new compat.FetchResultImpl(
      root,
      "https://example.com"
    );

    expect(legacyResult).toBeDefined();
    expect(legacyResult.toMarkdown).toBeDefined();
    expect(legacyResult.toFetchResult).toBeDefined();

    const fetchResult = legacyResult.toFetchResult();
    expect(fetchResult.root).toBe(root);
    expect(fetchResult.metadata.source).toBe("https://example.com");
  });

  it("should convert file formats", () => {
    const oldFile = {
      filePath: "test.ts",
      text: "console.log('hello');",
      lang: "typescript",
      length: 20,
      tokenCount: 5,
    };

    const converted = compat.convertFileFormat(oldFile);

    expect(converted.path).toBe("test.ts");
    expect(converted.content).toBe("console.log('hello');");
    expect(converted.language).toBe("typescript");
    expect(converted.size).toBe(20);
    expect(converted.tokens).toBe(5);
  });

  it("should convert options", () => {
    const oldOptions = {
      includeOnly: [".ts", ".js"],
      excludePaths: ["node_modules"],
      tokenLimit: 10_000,
      encoder: "cl100k",
      outputFormat: "markdown",
      verbose: true,
    };

    const converted = compat.convertOptions(oldOptions);

    expect(converted.extensions).toEqual([".ts", ".js"]);
    expect(converted.excludeDirs).toEqual(["node_modules"]);
    expect(converted.maxTokens).toBe(10_000);
    expect(converted.tokenEncoder).toBe("cl100k");
    expect(converted.format).toBe("markdown");
    expect(converted.verbose).toBe(true);
  });

  it("should generate migration guide", () => {
    const guide = generateMigrationGuide("1.0", "2.0");

    expect(guide).toBeDefined();
    expect(guide).toContain("Migration Guide");
    expect(guide).toContain("Breaking Changes");
  });

  it("should check if code needs migration", () => {
    const oldCode = `
      import { FetchResultImpl } from 'codefetch-sdk';
      const result = new FetchResultImpl(root, url);
      const options = { includeOnly: ['.ts'], tokenLimit: 1000 };
    `;

    const result = needsMigration(oldCode);

    expect(result.needsMigration).toBe(true);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("should not need migration for new code", () => {
    const newCode = `
      import { FetchResultImpl } from 'codefetch-sdk/worker';
      const result = new FetchResultImpl(root, metadata);
      const options = { extensions: ['.ts'], maxTokens: 1_000 };
    `;

    const result = needsMigration(newCode);

    expect(result.needsMigration).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it("should auto-migrate code", () => {
    const oldCode = `
      import { FetchResultImpl } from 'codefetch-sdk';
      const options = { includeOnly: ['.ts'], tokenLimit: 1000 };
    `;

    const migrated = autoMigrateCode(oldCode);

    expect(migrated).toContain("from 'codefetch-sdk/worker'");
    expect(migrated).toContain("extensions:");
    expect(migrated).toContain("maxTokens:");
    expect(migrated).not.toContain("includeOnly:");
    expect(migrated).not.toContain("tokenLimit:");
  });
});
