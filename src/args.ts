import type { ParsedArgs } from "./types";

export function printHelp() {
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
  -t, --project-tree <level>  Generate project tree with specified depth (default: 2)
  -v, --verbose [level]       Show processing information (0=none, 1=basic, 2=debug)
  -h, --help                 Display this help message
`);
}

export function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    output: null,
    maxTokens: null,
    extensions: null,
    verbose: 0,
    includeFiles: null,
    excludeFiles: null,
    includeDirs: null,
    excludeDirs: null,
    treeLevel: null,
  };

  // Skip node and script name if running from CLI
  const args = argv[0]?.endsWith("node") ? argv.slice(2) : argv;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      throw new Error("Help message displayed");
    } else if (arg === "-v" || arg === "--verbose") {
      // Check if next argument is a number
      const nextArg = args[i + 1];
      if (nextArg && /^[0-2]$/.test(nextArg)) {
        result.verbose = Number(nextArg);
        i++; // Skip the next argument
      } else {
        result.verbose = 1; // Default to basic verbosity if no level specified
      }
    } else if ((arg === "-t" || arg === "--project-tree") && args[i + 1]) {
      const level = Number.parseInt(args[i + 1], 10);
      if (!Number.isNaN(level)) {
        result.treeLevel = level;
      }
      i++;
    } else if ((arg === "-o" || arg === "--output") && args[i + 1]) {
      result.output = args[i + 1];
      i++;
    } else if ((arg === "--max-tokens" || arg === "-tok") && args[i + 1]) {
      const tokens = Number.parseInt(args[i + 1], 10);
      if (!Number.isNaN(tokens)) {
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
    }
  }
  return result;
}
