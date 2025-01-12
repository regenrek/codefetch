#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ignore from "ignore";
import { DEFAULT_IGNORE_PATTERNS } from "./default-ignore";
import { parseArgs } from "./args";
import { collectFiles } from "./files";
import { generateMarkdown } from "./markdown";

// Type exports
export type { ParsedArgs } from "./types";

// Function exports
export { parseArgs } from "./args";
export { collectFiles } from "./files";
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
  } = parseArgs(process.argv);

  // Initialize ignore instance with default patterns
  const ig = ignore().add(
    DEFAULT_IGNORE_PATTERNS.split("\n").filter(
      (line) => line && !line.startsWith("#"),
    ),
  );

  // Try reading .gitignore if it exists
  try {
    const gitignoreContent = fs.readFileSync(
      path.join(process.cwd(), ".gitignore"),
      "utf8",
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

  // Generate markdown
  const totalTokens = await generateMarkdown(allFiles, {
    outputPath: outputFile ? path.join(process.cwd(), outputFile) : null,
    maxTokens,
    verbose,
  });

  if (outputFile) {
    console.log(`\n✓ Output written to: ${outputFile}`);
    console.log(`✓ Approximate token count: ${totalTokens}`);
  }
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}
