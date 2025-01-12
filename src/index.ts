#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// We'll use `ignore` to handle ignoring files
import ignore from "ignore";
import { DEFAULT_IGNORE_PATTERNS } from "./default-ignore";

// Resolve current directory in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ParsedArgs {
  output: string | null;
}

/**
 * Simple function to parse CLI args:
 *
 * -o, --output <file> : specify output filename
 */
function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    output: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === "-o" || arg === "--output") && argv[i + 1]) {
      result.output = argv[i + 1];
      i++;
    }
  }
  return result;
}

const { output } = parseArgs(process.argv);

// Initialize ignore instance with default patterns
const ig = ignore().add(DEFAULT_IGNORE_PATTERNS);

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

// Try reading .boltfetchignore if it exists
try {
  const boltfetchignoreContent = fs.readFileSync(
    path.join(process.cwd(), ".boltfetchignore"),
    "utf8"
  );
  ig.add(boltfetchignoreContent);
} catch {
  // .boltfetchignore not found or unreadable - that's fine
}

/**
 * Recursively collect all files in the current working directory,
 * ignoring anything matched by .gitignore or .boltfetchignore (if present).
 */
function collectFiles(dir: string): string[] {
  const results: string[] = [];
  const list = fs.readdirSync(dir);

  for (const filename of list) {
    // Full path
    const filePath = path.join(dir, filename);
    // Relative path from CWD (for ignoring logic)
    const relPath = path.relative(process.cwd(), filePath);

    // If ignored by .gitignore or .boltfetchignore, skip
    if (ig.ignores(relPath)) {
      continue;
    }

    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recurse into subdirectory
      results.push(...collectFiles(filePath));
    } else {
      // It's a file
      results.push(filePath);
    }
  }
  return results;
}

// Actually gather up the file list
const allFiles = collectFiles(process.cwd());

/**
 * Generate the final markdown content.
 * We replicate the style:
 *
 * /path/to/file:
 * --------------------------------------------------------------------------------
 * 1 | ...
 * 2 | ...
 * --------------------------------------------------------------------------------
 */
function generateMarkdown(files: string[]): string {
  const lines: string[] = [];

  for (const file of files) {
    // Turn absolute path into something relative
    const relativePath = path.relative(process.cwd(), file);
    const content = fs.readFileSync(file, "utf8");

    // Start of file block
    lines.push(`/${relativePath}:`);
    lines.push(
      "--------------------------------------------------------------------------------"
    );

    // Add line numbers
    const fileLines = content.split("\n");
    fileLines.forEach((line, i) => {
      // +1 because line numbers start at 1
      lines.push(`${i + 1} | ${line}`);
    });

    lines.push("");
    lines.push(
      "--------------------------------------------------------------------------------"
    );
  }

  return lines.join("\n");
}

// Build the final output
const final = generateMarkdown(allFiles);

// Write to file if `-o/--output` was given, else print to stdout
if (output) {
  fs.writeFileSync(output, final, "utf8");
  console.log(`All files are written to ${output}.`);
} else {
  console.log(final);
}
