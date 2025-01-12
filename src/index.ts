#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import readline from "readline";

// We'll use `ignore` to handle ignoring files
import ignore from "ignore";
import { DEFAULT_IGNORE_PATTERNS } from "./default-ignore";

// Add this right after the imports
if (!DEFAULT_IGNORE_PATTERNS || typeof DEFAULT_IGNORE_PATTERNS !== "string") {
  console.error("Warning: Default ignore patterns could not be loaded");
  process.exit(1);
}

// Resolve current directory in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ParsedArgs {
  output: string | null;
  maxTokens: number | null;
  extensions: string[] | null;
  verbose: boolean;
  includeFiles: string[] | null;
  excludeFiles: string[] | null;
  includeDirs: string[] | null;
  excludeDirs: string[] | null;
}

/**
 * Simple function to parse CLI args:
 *
 * -o, --output <file> : specify output filename
 * --max-tokens, -tok <number> : limit output tokens
 * -e, --extension <ext,...> : filter by file extensions (.ts,.js etc)
 * -if, --include-files <pattern,...> : include specific files
 * -ef, --exclude-files <pattern,...> : exclude specific files
 * -id, --include-dir <pattern,...> : include specific directories
 * -ed, --exclude-dir <pattern,...> : exclude specific directories
 */
function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    output: null,
    maxTokens: null,
    extensions: null,
    verbose: false,
    includeFiles: null,
    excludeFiles: null,
    includeDirs: null,
    excludeDirs: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "-v" || arg === "--verbose") {
      result.verbose = true;
    } else if ((arg === "-o" || arg === "--output") && argv[i + 1]) {
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
    } else if ((arg === "-if" || arg === "--include-files") && argv[i + 1]) {
      result.includeFiles = argv[i + 1].split(",");
      i++;
    } else if ((arg === "-ef" || arg === "--exclude-files") && argv[i + 1]) {
      result.excludeFiles = argv[i + 1].split(",");
      i++;
    } else if ((arg === "-id" || arg === "--include-dir") && argv[i + 1]) {
      result.includeDirs = argv[i + 1].split(",");
      i++;
    } else if ((arg === "-ed" || arg === "--exclude-dir") && argv[i + 1]) {
      result.excludeDirs = argv[i + 1].split(",");
      i++;
    } else if (arg.startsWith("--include-files=")) {
      result.includeFiles = arg.split("=")[1].split(",");
    } else if (arg.startsWith("--exclude-files=")) {
      result.excludeFiles = arg.split("=")[1].split(",");
    } else if (arg.startsWith("--include-dir=")) {
      result.includeDirs = arg.split("=")[1].split(",");
    } else if (arg.startsWith("--exclude-dir=")) {
      result.excludeDirs = arg.split("=")[1].split(",");
    }
  }
  return result;
}

const {
  output,
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

// Create a Set for O(1) lookup instead of array includes
const extensionSet = extensions ? new Set(extensions) : null;

/**
 * Recursively collect all files in the current working directory,
 * ignoring anything matched by .gitignore or .codefetchignore (if present).
 */
async function collectFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const list = await fs.promises.readdir(dir);

  // Move regex compilation outside the loop
  const excludePatterns = excludeFiles?.map(
    (pattern) => new RegExp(pattern.replace(/\*/g, ".*"))
  );
  const includePatterns = includeFiles?.map(
    (pattern) => new RegExp(pattern.replace(/\*/g, ".*"))
  );

  for (const filename of list) {
    const filePath = path.join(dir, filename);
    const relPath = path.relative(process.cwd(), filePath);

    if (ig.ignores(relPath)) {
      continue;
    }

    const stat = await fs.promises.stat(filePath);

    if (stat.isDirectory()) {
      // Check directory filters
      const dirName = path.basename(filePath);
      if (excludeDirs && excludeDirs.includes(dirName)) {
        continue;
      }
      if (includeDirs && !includeDirs.includes(dirName)) {
        continue;
      }

      results.push(...(await collectFiles(filePath)));
    } else {
      // Check file filters
      if (
        excludePatterns &&
        excludePatterns.some((pattern) => pattern.test(filename))
      ) {
        continue;
      }
      if (
        includePatterns &&
        !includePatterns.some((pattern) => pattern.test(filename))
      ) {
        continue;
      }
      if (extensionSet) {
        const ext = path.extname(filename);
        if (!extensionSet.has(ext)) {
          continue;
        }
      }

      results.push(filePath);
    }
  }
  return results;
}

// Actually gather up the file list
const allFiles = await collectFiles(process.cwd());

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
async function generateMarkdown(files: string[]): Promise<string> {
  const output = output ? fs.createWriteStream(outputPath) : process.stdout;
  let totalTokens = 0;

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);

    // Stream the file instead of reading it all at once
    const fileStream = fs.createReadStream(file, { encoding: "utf8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    output.write(`/${relativePath}:\n`);
    output.write("-".repeat(80) + "\n");

    let lineNumber = 1;
    for await (const line of rl) {
      const formattedLine = `${lineNumber} | ${line}\n`;
      output.write(formattedLine);
      totalTokens += estimateTokens(line);
      lineNumber++;

      if (maxTokens && totalTokens > maxTokens) {
        break;
      }
    }

    output.write("-".repeat(80) + "\n\n");
  }

  if (output !== process.stdout) {
    output.end();
  }

  return totalTokens;
}

async function processFilesInBatches(files: string[], batchSize = 100) {
  const results = [];
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchPromises = batch.map(async (file) => {
      // Process each file
      return processFile(file);
    });
    results.push(...(await Promise.all(batchPromises)));
  }
  return results;
}

async function processFile(file: string) {
  // Process individual file
  const content = await fs.promises.readFile(file, "utf8");
  // ... process content ...
  return { file, content };
}

async function main() {
  const allFiles = await collectFiles(process.cwd());
  const totalTokens = await generateMarkdown(allFiles);
  // ... rest of the code
}

main().catch(console.error);

function printHelp() {
  console.log(`
Usage: codefetch [options]

Options:
  -o, --output <file>         Specify output filename
  -tok, --max-tokens <n>      Limit output tokens (useful for AI models)
  -e, --extension <ext,...>   Filter by file extensions (e.g., .ts,.js)
  -if, --include-files <p,..> Include specific files (supports patterns)
  -ef, --exclude-files <p,..> Exclude specific files (supports patterns)
  -id, --include-dir <d,...>  Include specific directories
  -ed, --exclude-dir <d,...>  Exclude specific directories
  -v, --verbose              Show detailed processing information
  -h, --help                 Display this help message

Examples:
  codefetch --exclude-dir=node_modules,public
  codefetch --include-files=*.ts,*.js
  codefetch -ef test.ts,temp.js -id src
`);
}
