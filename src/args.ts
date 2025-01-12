import type { ParsedArgs } from "./types";
import minimist from "minimist";

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

export function parseArgs(args: string[]) {
  const argv = minimist(args, {
    string: [
      "output",
      "extension",
      "include-files",
      "exclude-files",
      "include-dir",
      "exclude-dir",
    ],
    boolean: ["help", "project-tree"],
    alias: {
      o: "output",
      e: "extension",
      if: "include-files",
      ef: "exclude-files",
      id: "include-dir",
      ed: "exclude-dir",
      v: "verbose",
      t: "project-tree",
      tok: "max-tokens",
      h: "help",
    },
  });

  // Handle project-tree flag with default value
  let treeDepth: number | undefined;
  if (argv["project-tree"]) {
    // If -t or --project-tree is used without a value, use default of 2
    treeDepth =
      typeof argv["project-tree"] === "number" ? argv["project-tree"] : 2;
  }

  return {
    output: argv.output,
    extensions: argv.extension?.split(","),
    includeFiles: argv["include-files"]?.split(","),
    excludeFiles: argv["exclude-files"]?.split(","),
    includeDirs: argv["include-dir"]?.split(","),
    excludeDirs: argv["exclude-dir"]?.split(","),
    verbose: Number(argv.verbose) || 0,
    projectTree: treeDepth,
    maxTokens: argv["max-tokens"] ? Number(argv["max-tokens"]) : undefined,
    help: argv.help,
  };
}
