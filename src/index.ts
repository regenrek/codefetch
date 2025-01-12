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
  maxTokens: number | null;
  extensions: string[] | null;
}

/**
 * Simple function to parse CLI args:
 *
 * -o, --output <file> : specify output filename
 * --max-tokens, -tok <number> : limit output tokens
 * -e, --extension <ext,...> : filter by file extensions (.ts,.js etc)
 */
function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    output: null,
    maxTokens: null,
    extensions: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === "-o" || arg === "--output") && argv[i + 1]) {
      result.output = argv[i + 1];
      i++;
    } else if ((arg === "--max-tokens" || arg === "-tok") && argv[i + 1]) {
      const tokens = parseInt(argv[i + 1]);
      if (!isNaN(tokens)) {
        result.maxTokens = tokens;
      }
      i++;
    } else if ((arg === "-e" || arg === "--extension") && argv[i + 1]) {
      result.extensions = argv[i + 1]
        .split(",")
        .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));
      i++;
    }
  }
  return result;
}

const { output, maxTokens, extensions } = parseArgs(process.argv);

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

// Try reading .codefetchignore if it exists
try {
  const codefetchignoreContent = fs.readFileSync(
    path.join(process.cwd(), ".codefetchignore"),
    "utf8"
  );
  ig.add(codefetchignoreContent);
} catch {
  // .codefetchignore not found or unreadable - that's fine
}

/**
 * Recursively collect all files in the current working directory,
 * ignoring anything matched by .gitignore or .codefetchignore (if present).
 */
function collectFiles(dir: string): string[] {
  const results: string[] = [];
  const list = fs.readdirSync(dir);

  for (const filename of list) {
    const filePath = path.join(dir, filename);
    const relPath = path.relative(process.cwd(), filePath);

    if (ig.ignores(relPath)) {
      continue;
    }

    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results.push(...collectFiles(filePath));
    } else {
      // Check file extension if extensions filter is active
      if (extensions) {
        const ext = path.extname(filename);
        if (!extensions.includes(ext)) {
          continue;
        }
      }
      results.push(filePath);
    }
  }
  return results;
}

// Actually gather up the file list
const allFiles = collectFiles(process.cwd());

/**
 * Very rough token count estimation.
 * This is a simple approximation - actual tokens may vary by tokenizer.
 */
function estimateTokens(text: string): number {
  // Rough estimate: Split on whitespace and punctuation
  return text.split(/[\s\p{P}]+/u).length;
}

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
  let totalTokens = 0;

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    const content = fs.readFileSync(file, "utf8");

    // Estimate tokens for this file
    const fileTokens = estimateTokens(content);

    // Skip if we would exceed max tokens
    if (maxTokens && totalTokens + fileTokens > maxTokens) {
      // lines.push(`\n// Skipped ${relativePath} to stay within token limit...`);
      continue;
    }

    totalTokens += fileTokens;

    // Rest of the existing code...
    lines.push(`/${relativePath}:`);
    lines.push(
      "--------------------------------------------------------------------------------"
    );

    const fileLines = content.split("\n");
    fileLines.forEach((line, i) => {
      lines.push(`${i + 1} | ${line}`);
    });

    lines.push("");
    lines.push(
      "--------------------------------------------------------------------------------"
    );
  }

  // if (maxTokens) {
  //   lines.unshift(`// Approximate token count: ${totalTokens}\n`);
  // }

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
