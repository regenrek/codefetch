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

export interface ParsedArgs {
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
export function parseArgs(argv: string[]): ParsedArgs {
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

  // Skip node and script name if running from CLI
  const args = argv[0]?.endsWith("node") ? argv.slice(2) : argv;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "-v" || arg === "--verbose") {
      result.verbose = true;
    } else if ((arg === "-o" || arg === "--output") && args[i + 1]) {
      result.output = args[i + 1];
      i++;
    } else if ((arg === "--max-tokens" || arg === "-tok") && args[i + 1]) {
      const tokens = parseInt(args[i + 1]);
      if (!isNaN(tokens)) {
        result.maxTokens = tokens;
      }
      i++;
    } else if ((arg === "-e" || arg === "--extension") && args[i + 1]) {
      result.extensions = args[i + 1]
        .split(",")
        .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));
      i++;
    } else if ((arg === "-if" || arg === "--include-files") && args[i + 1]) {
      result.includeFiles = args[i + 1].split(",");
      i++;
    } else if ((arg === "-ef" || arg === "--exclude-files") && args[i + 1]) {
      result.excludeFiles = args[i + 1].split(",");
      i++;
    } else if ((arg === "-id" || arg === "--include-dir") && args[i + 1]) {
      result.includeDirs = args[i + 1].split(",");
      i++;
    } else if ((arg === "-ed" || arg === "--exclude-dir") && args[i + 1]) {
      result.excludeDirs = args[i + 1].split(",");
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

// Move all the main logic into the main function
async function main() {
  const {
    output: outputFile, // rename to avoid conflict
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

  // Actually gather up the file list
  const allFiles = await collectFiles(process.cwd(), {
    ig,
    extensionSet,
    excludeFiles,
    includeFiles,
    excludeDirs,
    includeDirs,
  });

  // Create output directory if needed
  if (outputFile) {
    const codefetchDir = path.join(process.cwd(), "codefetch");
    if (!fs.existsSync(codefetchDir)) {
      fs.mkdirSync(codefetchDir, { recursive: true });
      console.log("Created codefetch directory.");
    }

    // Create .codefetchignore if it doesn't exist
    const codefetchignorePath = path.join(process.cwd(), ".codefetchignore");
    if (!fs.existsSync(codefetchignorePath)) {
      const ignoreContent = "# Codefetch specific ignores\ncodefetch/\n";
      fs.writeFileSync(codefetchignorePath, ignoreContent, "utf8");
      console.log(
        "Created .codefetchignore file. Add 'codefetch/' to your .gitignore to avoid committing fetched code."
      );
    }
  }

  const outputPath = outputFile
    ? path.join(process.cwd(), "codefetch", outputFile)
    : null;

  const totalTokens = await generateMarkdown(allFiles, {
    outputPath,
    maxTokens,
    verbose,
  });

  if (outputFile) {
    console.log("\nSummary:");
    console.log("✓ Code was successfully fetched");
    console.log(`✓ Output written to: ${outputPath}`);
    console.log(`✓ Approximate token count: ${totalTokens}`);
  }
}

// Update collectFiles to accept options object
export async function collectFiles(
  dir: string,
  options: {
    ig: ReturnType<typeof ignore>;
    extensionSet: Set<string> | null;
    excludeFiles: string[] | null;
    includeFiles: string[] | null;
    excludeDirs: string[] | null;
    includeDirs: string[] | null;
  }
): Promise<string[]> {
  const results: string[] = [];
  const list = await fs.promises.readdir(dir);

  // Move regex compilation outside the loop
  const excludePatterns = options.excludeFiles?.map(
    (pattern) => new RegExp(pattern.replace(/\*/g, ".*"))
  );
  const includePatterns = options.includeFiles?.map(
    (pattern) => new RegExp(pattern.replace(/\*/g, ".*"))
  );

  for (const filename of list) {
    const filePath = path.join(dir, filename);
    const relPath = path.relative(process.cwd(), filePath);

    if (options.ig.ignores(relPath)) {
      continue;
    }

    const stat = await fs.promises.stat(filePath);

    if (stat.isDirectory()) {
      // Check directory filters
      const dirName = path.basename(filePath);
      if (options.excludeDirs && options.excludeDirs.includes(dirName)) {
        continue;
      }
      if (options.includeDirs && !options.includeDirs.includes(dirName)) {
        continue;
      }

      results.push(
        ...(await collectFiles(filePath, {
          ig: options.ig,
          extensionSet: options.extensionSet,
          excludeFiles: options.excludeFiles,
          includeFiles: options.includeFiles,
          excludeDirs: options.excludeDirs,
          includeDirs: options.includeDirs,
        }))
      );
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
      if (options.extensionSet) {
        const ext = path.extname(filename);
        if (!options.extensionSet.has(ext)) {
          continue;
        }
      }

      results.push(filePath);
    }
  }
  return results;
}

// Update generateMarkdown to handle stream types correctly
export async function generateMarkdown(
  files: string[],
  options: {
    outputPath: string | null;
    maxTokens: number | null;
    verbose: boolean;
  }
): Promise<number> {
  // Create output directory if needed
  if (options.outputPath) {
    const outputDir = path.dirname(options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  // Cast output to NodeJS.WritableStream to unify the type
  const output = options.outputPath
    ? (fs.createWriteStream(options.outputPath) as NodeJS.WritableStream)
    : (process.stdout as NodeJS.WritableStream);
  let totalTokens = 0;

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);

    const fileStream = fs.createReadStream(file, { encoding: "utf8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    // Now these write calls are unambiguous
    output.write(`/${relativePath}:\n`);
    output.write("-".repeat(80) + "\n");

    let lineNumber = 1;
    for await (const line of rl) {
      const lineTokens = estimateTokens(line);
      if (options.maxTokens && totalTokens + lineTokens > options.maxTokens) {
        break;
      }

      const formattedLine = `${lineNumber} | ${line}\n`;
      output.write(formattedLine);
      totalTokens += lineTokens;
      lineNumber++;
    }

    output.write("-".repeat(80) + "\n\n");

    if (options.maxTokens && totalTokens >= options.maxTokens) {
      break;
    }
  }

  // Only end the stream if it's a file stream and wait for it to finish
  if (options.outputPath) {
    await new Promise<void>((resolve, reject) => {
      (output as fs.WriteStream).end((err: NodeJS.ErrnoException | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  return totalTokens;
}

/**
 * Very rough token count estimation.
 * This is a simple approximation - actual tokens may vary by tokenizer.
 */
function estimateTokens(text: string): number {
  // Split on whitespace and punctuation, filter out empty strings
  return text.split(/[\s\p{P}]+/u).filter(Boolean).length;
}

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

// Start the program
if (require.main === module) {
  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}
