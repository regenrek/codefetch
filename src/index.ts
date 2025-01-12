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

  function logVerbose(message: string, level: number) {
    if (verbose >= level) {
      console.log(message);
    }
  }

  logVerbose("Starting codefetch...", 1);
  logVerbose(`Working directory: ${process.cwd()}`, 2);

  // Initialize ignore instance with default patterns
  const ig = ignore().add(
    DEFAULT_IGNORE_PATTERNS.split("\n").filter(
      (line) => line && !line.startsWith("#")
    )
  );
  logVerbose("Initialized ignore patterns", 2);

  // Try reading .gitignore if it exists
  try {
    const gitignoreContent = fs.readFileSync(
      path.join(process.cwd(), ".gitignore"),
      "utf8"
    );
    ig.add(gitignoreContent);
    logVerbose("Added .gitignore patterns", 2);
  } catch {
    logVerbose(".gitignore not found - skipping", 2);
  }

  // Create a Set for O(1) lookup
  const extensionSet = extensions ? new Set(extensions) : null;
  if (extensionSet) {
    logVerbose(`Filtering for extensions: ${[...extensionSet].join(", ")}`, 1);
  }

  // Collect files
  logVerbose("Collecting files...", 1);
  const allFiles = await collectFiles(process.cwd(), {
    ig,
    extensionSet,
    excludeFiles,
    includeFiles,
    excludeDirs,
    includeDirs,
    verbose, // Pass verbose level to collectFiles
  });
  logVerbose(`Found ${allFiles.length} files to process`, 1);

  // Generate markdown with project tree
  logVerbose("Generating markdown...", 1);
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

main();
