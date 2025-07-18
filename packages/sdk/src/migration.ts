/**
 * Migration helpers and compatibility layer for version changes
 */

import type { FetchResult, FileNode } from "./types.js";
import { treeToFiles } from "./tree-utils.js";
import { generateMarkdownFromContent } from "./markdown-content.js";
import type { FileContent } from "./markdown-content.js";

/**
 * Migrate from old v1 result format to new format
 */
export function migrateFromV1(oldResult: {
  root: any;
  url?: string;
  metadata?: any;
}): FetchResult {
  // Convert old root structure to new FileNode format
  const convertNode = (node: any): FileNode => {
    return node.type === "file"
      ? {
          name: node.name || node.path?.split("/").pop() || "",
          path: node.path || "",
          type: "file",
          content: node.content || "",
          language: node.language,
          size: node.size ?? node.content?.length ?? 0,
          tokens: node.tokens,
        }
      : {
          name: node.name || "root",
          path: node.path || "",
          type: "directory",
          children: node.children?.map(convertNode) || [],
        };
  };

  const root = convertNode(oldResult.root);

  // Calculate metadata if not provided
  let metadata = oldResult.metadata;
  if (!metadata) {
    let totalFiles = 0;
    let totalSize = 0;
    let totalTokens = 0;

    const countFiles = (node: FileNode) => {
      if (node.type === "file") {
        totalFiles++;
        totalSize += node.size || 0;
        totalTokens += node.tokens || 0;
      } else if (node.children) {
        for (const child of node.children) {
          countFiles(child);
        }
      }
    };

    countFiles(root);

    metadata = {
      totalFiles,
      totalSize,
      totalTokens,
      fetchedAt: new Date(),
      source: oldResult.url || "unknown",
    };
  }

  return {
    root,
    metadata,
  };
}

/**
 * Compatibility layer for old API
 */
export const compat = {
  /**
   * Legacy FetchResultImpl that maintains backward compatibility
   */
  FetchResultImpl: class LegacyFetchResultImpl {
    root: FileNode;
    url: string;
    result: FetchResult;

    constructor(root: FileNode | any, urlOrMetadata: string | any) {
      if (typeof urlOrMetadata === "string") {
        // Old constructor signature
        this.root = root;
        this.url = urlOrMetadata;
        this.result = {
          root,
          metadata: {
            totalFiles: 0,
            totalSize: 0,
            totalTokens: 0,
            fetchedAt: new Date(),
            source: urlOrMetadata,
          },
        };
      } else {
        // New constructor signature
        this.root = root;
        this.url = urlOrMetadata?.source || "unknown";
        this.result = {
          root,
          metadata: urlOrMetadata,
        };
      }
    }

    /**
     * Legacy toMarkdown method
     */
    async toMarkdown(): Promise<string> {
      const files = treeToFiles(this.root);
      return generateMarkdownFromContent(files, {
        includeTreeStructure: true,
      });
    }

    /**
     * Get the modern FetchResult
     */
    toFetchResult(): FetchResult {
      return this.result;
    }
  },

  /**
   * Legacy function signatures
   */
  async fetchFromWeb(url: string, options?: any): Promise<any> {
    const { fetchFromWebWorker } = await import(
      "./web/sdk-web-fetch-worker.js"
    );
    const result = await fetchFromWebWorker(url, options);

    // Convert to legacy format if needed
    if (options?.legacyFormat && typeof result !== "string") {
      return new this.FetchResultImpl(result.root, result.metadata);
    }

    return result;
  },

  /**
   * Convert between old and new file formats
   */
  convertFileFormat(oldFile: any): FileContent {
    return {
      path: oldFile.path || oldFile.filePath || "",
      content: oldFile.content || oldFile.text || "",
      language: oldFile.language || oldFile.lang,
      size: oldFile.size ?? oldFile.length ?? undefined,
      tokens: oldFile.tokens || oldFile.tokenCount,
    };
  },

  /**
   * Convert old options to new format
   */
  convertOptions(oldOptions: any): any {
    const newOptions: any = {};

    // Map old option names to new ones
    const optionMap: Record<string, string> = {
      includeOnly: "extensions",
      excludePaths: "excludeDirs",
      tokenLimit: "maxTokens",
      encoder: "tokenEncoder",
      outputFormat: "format",
      treeDepth: "projectTree",
    };

    for (const [oldKey, newKey] of Object.entries(optionMap)) {
      if (oldOptions[oldKey] !== undefined) {
        newOptions[newKey] = oldOptions[oldKey];
      }
    }

    // Copy over unchanged options
    const unchangedOptions = [
      "verbose",
      "dryRun",
      "disableLineNumbers",
      "defaultIgnore",
      "gitignore",
    ];

    for (const key of unchangedOptions) {
      if (oldOptions[key] !== undefined) {
        newOptions[key] = oldOptions[key];
      }
    }

    return newOptions;
  },
};

/**
 * Migration guide generator
 */
export function generateMigrationGuide(
  fromVersion: string,
  toVersion: string
): string {
  const guides: Record<string, string> = {
    "1.0-to-2.0": `
# Migration Guide: v1.0 to v2.0

## Breaking Changes

### 1. Import paths changed:
\`\`\`javascript
// Old
import { FetchResultImpl } from 'codefetch-sdk';

// New
import { FetchResultImpl } from 'codefetch-sdk/worker';
\`\`\`

### 2. Constructor signature changed:
\`\`\`javascript
// Old
const result = new FetchResultImpl(root, url);

// New
const result = new FetchResultImpl(root, metadata);
\`\`\`

### 3. Options renamed:
- \`includeOnly\` → \`extensions\`
- \`excludePaths\` → \`excludeDirs\`
- \`tokenLimit\` → \`maxTokens\`

## Using the compatibility layer:

\`\`\`javascript
import { compat } from 'codefetch-sdk/migration';

// Use old API with compatibility layer
const result = new compat.FetchResultImpl(root, url);
const markdown = result.toMarkdown();
\`\`\`
`,
  };

  const key = `${fromVersion}-to-${toVersion}`;
  return (
    guides[key] ||
    `No migration guide available for ${fromVersion} to ${toVersion}`
  );
}

/**
 * Check if code needs migration
 */
export function needsMigration(code: string): {
  needsMigration: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check for old import patterns
  if (code.includes("from 'codefetch-sdk'") && !code.includes("/worker")) {
    issues.push("Using old import path");
    suggestions.push("Change imports to 'codefetch-sdk/worker'");
  }

  // Check for old constructor patterns
  if (code.includes("new FetchResultImpl") && code.includes(", url")) {
    issues.push("Using old FetchResultImpl constructor");
    suggestions.push("Update to new constructor with metadata object");
  }

  // Check for old option names
  const oldOptions = ["includeOnly", "excludePaths", "tokenLimit"];
  for (const option of oldOptions) {
    if (code.includes(option)) {
      issues.push(`Using deprecated option: ${option}`);
      suggestions.push(`Rename according to migration guide`);
    }
  }

  return {
    needsMigration: issues.length > 0,
    issues,
    suggestions,
  };
}

/**
 * Auto-migrate code (basic string replacements)
 */
export function autoMigrateCode(code: string): string {
  let migrated = code;

  // Update imports
  migrated = migrated.replace(
    /from ['"]codefetch-sdk['"]/g,
    "from 'codefetch-sdk/worker'"
  );

  // Update option names
  const replacements: Record<string, string> = {
    includeOnly: "extensions",
    excludePaths: "excludeDirs",
    tokenLimit: "maxTokens",
    encoder: "tokenEncoder",
    outputFormat: "format",
  };

  for (const [old, newName] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${old}\\b`, "g");
    migrated = migrated.replace(regex, newName);
  }

  return migrated;
}
