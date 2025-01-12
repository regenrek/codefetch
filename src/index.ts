#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ignore from "ignore";
import { DEFAULT_IGNORE_PATTERNS } from "./default-ignore";
import { parseArgs } from "./args";
import {
  collectFiles,
  resolveCodefetchPath,
  generateProjectTree,
} from "./files";
import { generateMarkdown } from "./markdown";

// Type exports
export type { ParsedArgs } from "./types";

// Function exports
export { parseArgs } from "./args";
export {
  collectFiles,
  resolveCodefetchPath,
  generateProjectTree,
} from "./files";
export { generateMarkdown } from "./markdown";

// Main function for CLI
async function main() {
  const {
    output: outputFile,
    maxTokens,
    extensions,
    verbose,
    includeFiles,
    excludeFiles,
    includeDirs,
    excludeDirs,
    treeLevel,
  } = parseArgs(process.argv);

  // Initialize ignore instance with default patterns
  const ig = ignore().add(
    DEFAULT_IGNORE_PATTERNS.split("\n").filter(
      (line) => line && !line.startsWith("#")
    )
  );

  // Try reading .gitignore if it exists
  try {
    const gitignoreContent = fs.readFileSync(
      path.join(process.cwd(), ".gitignore"),
      "utf8"
    );
    ig.add(gitignoreContent);
  } catch {
    // .gitignore not found or unreadable - that's fine
  }

  // Create a Set for O(1) lookup
  const extensionSet = extensions ? new Set(extensions) : null;

  // Collect files
  const allFiles = await collectFiles(process.cwd(), {
    ig,
    extensionSet,
    excludeFiles,
    includeFiles,
    excludeDirs,
    includeDirs,
  });

  // Generate markdown with project tree
  const totalTokens = await generateMarkdown(allFiles, {
    outputPath: outputFile && resolveCodefetchPath(outputFile),
    maxTokens,
    verbose,
    projectTree:
      treeLevel === null
        ? undefined
        : generateProjectTree(process.cwd(), treeLevel),
  });

  if (outputFile) {
    console.log(`\n✓ Output written to: codefetch/${outputFile}`);
    console.log(`✓ Approximate token count: ${totalTokens}`);
  }
}

// Use top-level await instead of .catch()
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}
