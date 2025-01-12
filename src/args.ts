import type { ParsedArgs } from "./types";
import minimist from "minimist";
import path from "node:path";

export function printHelp() {
  console.log(`
Usage: codefetch [options]

Options:
  -o, --output <file>         Specify output filename
  --max-tokens <n>            Limit output tokens (useful for AI models)
  -e, --extension <ext,...>   Filter by file extensions (e.g., .ts,.js)
  --include-files <p,...>     Include specific files (supports patterns)
  --exclude-files <p,...>     Exclude specific files (supports patterns)
  --include-dir <d,...>       Include specific directories
  --exclude-dir <d,...>       Exclude specific directories
  -t, --project-tree <level>  Generate project tree with specified depth (default: 2)
  -v, --verbose [level]       Show processing information (0=none, 1=basic, 2=debug)
  -h, --help                  Display this help message
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
      "max-tokens",
    ],
    boolean: ["help", "project-tree"],
    alias: {
      o: "output",
      e: "extension",
      v: "verbose",
      t: "project-tree",
      h: "help",
    },
  });

  // Handle project-tree flag with default value
  let treeDepth: number | undefined;
  if (argv["project-tree"]) {
    treeDepth =
      typeof argv["project-tree"] === "number" ? argv["project-tree"] : 2;
  }

  // Process extensions to ensure they start with a dot
  const extensions = argv.extension
    ?.split(",")
    .map((ext: string) => (ext.startsWith(".") ? ext : `.${ext}`));

  // Normalize directory paths to use platform-specific separators
  const normalizeDirs = (dirs: string[] | undefined) =>
    dirs?.map((dir: string) =>
      path.normalize(dir.trim().replace(/^['"]+|['"]+$/g, ""))
    );

  return {
    output: argv.output,
    extensions,
    includeFiles: argv["include-files"]?.split(","),
    excludeFiles: argv["exclude-files"]?.split(","),
    includeDirs: normalizeDirs(argv["include-dir"]?.split(",")),
    excludeDirs: normalizeDirs(argv["exclude-dir"]?.split(",")),
    verbose: argv.verbose === undefined ? 1 : Number(argv.verbose),
    projectTree: treeDepth,
    maxTokens: argv["max-tokens"] ? Number(argv["max-tokens"]) : undefined,
    help: argv.help,
  };
}
