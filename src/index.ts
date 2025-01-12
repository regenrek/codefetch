#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ignore from "ignore";
import { DEFAULT_IGNORE_PATTERNS } from "./default-ignore";
import { parseArgs, printHelp } from "./args";
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

// Add this helper function at the top level
function ensureCodefetchIgnore() {
  const ignorePath = path.join(process.cwd(), ".codefetchignore");
  if (!fs.existsSync(ignorePath)) {
    fs.writeFileSync(ignorePath, "test/\nvitest.config.ts\n");
  }
}

// Main function for CLI
export async function main(args: string[] = process.argv) {
  try {
    const parsedArgs = parseArgs(args);

    if (parsedArgs.help) {
      printHelp();
      return;
    }

    // Ensure .codefetchignore exists
    ensureCodefetchIgnore();

    // Create ignore instance with default patterns
    const ig = ignore().add(
      DEFAULT_IGNORE_PATTERNS.split("\n").filter(
        (line) => line && !line.startsWith("#")
      )
    );

    // Add .gitignore patterns if exists
    const defaultIgnorePath = path.join(process.cwd(), ".gitignore");
    if (fs.existsSync(defaultIgnorePath)) {
      ig.add(fs.readFileSync(defaultIgnorePath, "utf8"));
    }

    // Add .codefetchignore patterns if exists
    const codefetchIgnorePath = path.join(process.cwd(), ".codefetchignore");
    if (fs.existsSync(codefetchIgnorePath)) {
      ig.add(fs.readFileSync(codefetchIgnorePath, "utf8"));
    }

    // Collect files
    const files = await collectFiles(process.cwd(), {
      ig,
      extensionSet: parsedArgs.extensions
        ? new Set(parsedArgs.extensions)
        : null,
      excludeFiles: parsedArgs.excludeFiles || null,
      includeFiles: parsedArgs.includeFiles || null,
      excludeDirs: parsedArgs.excludeDirs || null,
      includeDirs: parsedArgs.includeDirs || null,
      verbose: parsedArgs.verbose,
    });

    // Generate markdown
    const markdown = await generateMarkdown(files, {
      outputPath: parsedArgs.output
        ? resolveCodefetchPath(parsedArgs.output)
        : null,
      maxTokens: parsedArgs.maxTokens || null,
      verbose: parsedArgs.verbose,
      projectTree:
        parsedArgs.projectTree === undefined
          ? undefined
          : generateProjectTree(process.cwd(), parsedArgs.projectTree),
    });

    // Output
    if (parsedArgs.output) {
      if (parsedArgs.verbose > 0) {
        console.log(
          `Output written to ${resolveCodefetchPath(parsedArgs.output)}`
        );
      }
    } else {
      console.log(markdown);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Help message displayed") {
      return;
    }
    throw error;
  }
}

main();
