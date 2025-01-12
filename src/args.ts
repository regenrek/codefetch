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
  -v, --verbose              Show detailed processing information
  -h, --help                 Display this help message
`);
}

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
      throw new Error("Help message displayed");
    } else if (arg === "-v" || arg === "--verbose") {
      result.verbose = true;
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
