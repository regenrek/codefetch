import mri from "mri";
import { resolve } from "pathe";
import type { TokenEncoder } from "./types";

const VALID_ENCODERS = new Set(["simple", "p50k", "o200k", "cl100k"]);

export function printHelp() {
  console.log(`
Usage: codefetch [command] [options]

Commands:
  model info <model>         Get info about specific model (gpt-4-0125-preview)
  model info latest         Show all latest models
  model info preview        Show all preview models
  model info gpt4          Show GPT-4 models
  model info claude        Show Claude models
  model info mistral       Show Mistral models
  model info gemini        Show Google/Gemini models
  model info qwen          Show Qwen models
  model info all           Show all available models

Options:
  -o, --output <file>         Specify output filename (defaults to codebase.md)
  --dir <path>                Specify the directory to scan (defaults to current directory)
  --max-tokens <number>       Limit output tokens (default: 500,000)
  -e, --extension <ext,...>   Filter by file extensions (e.g., .ts,.js)
  --include-files <p,...>     Include specific files (supports patterns like *.ts)
  --exclude-files <p,...>     Exclude specific files (supports patterns like *.test.ts)
  --include-dir <dir,...>     Include specific directories
  --exclude-dir <dir,...>     Exclude specific directories
  -v, --verbose [level]       Show processing information (0=none, 1=basic, 2=debug)
  -t, --project-tree [depth]  Generate visual project tree (optional depth, default: 2)
  --token-encoder <type>      Token encoding method (simple, p50k, o200k, cl100k)
  --disable-line-numbers       Disable line numbers in output
  -h, --help                  Display this help message
`);
}

export function parseArgs(args: string[]) {
  const argv = mri(args, {
    alias: {
      o: "output",
      e: "extension",
      v: "verbose",
      t: "project-tree",
      h: "help",
      d: "dry-run",
    },
    boolean: ["help", "dry-run", "disable-line-numbers"],
    string: [
      "output",
      "dir",
      "extension",
      "include-files",
      "exclude-files",
      "include-dir",
      "exclude-dir",
      "max-tokens",
      "output-path",
      "token-encoder",
    ],
  });

  // Handle project-tree flag with default value
  // @TODO maybe we dont need this and just use default in config.ts
  let treeDepth: number | undefined;
  if ("project-tree" in argv) {
    treeDepth =
      argv["project-tree"] === true || argv["project-tree"] === ""
        ? 2
        : Number(argv["project-tree"]);
  }

  // Process extensions to ensure they start with a dot
  const extensions = argv.extension
    ? (Array.isArray(argv.extension) ? argv.extension : [argv.extension]).map(
        (ext: string) => (ext.startsWith(".") ? ext : `.${ext}`)
      )
    : undefined;

  // Helper to split comma-separated values
  const splitValues = (value: string | string[] | undefined) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  };

  // Normalize directory paths
  const normalizeDirs = (dirs: string | string[] | undefined) =>
    splitValues(dirs)?.map((dir) => resolve(dir.replace(/^['"]+|['"]+$/g, "")));

  if (argv["token-encoder"] && !VALID_ENCODERS.has(argv["token-encoder"])) {
    throw new Error(
      `Invalid token encoder. Must be one of: ${[...VALID_ENCODERS].join(", ")}`
    );
  }

  return {
    output: argv.output || undefined,
    outputPath: argv["output-path"] ? resolve(argv["output-path"]) : undefined,
    extensions,
    includeFiles: splitValues(argv["include-files"]),
    excludeFiles: splitValues(argv["exclude-files"]),
    includeDirs: normalizeDirs(argv["include-dir"]),
    excludeDirs: normalizeDirs(argv["exclude-dir"]),
    verbose: argv.verbose === undefined ? 1 : Number(argv.verbose),
    projectTree: treeDepth,
    maxTokens: argv["max-tokens"] ? Number(argv["max-tokens"]) : undefined,
    help: Boolean(argv.help),
    tokenEncoder: (argv["token-encoder"] || undefined) as
      | TokenEncoder
      | undefined,
    dryRun: Boolean(argv["dry-run"]),
    disableLineNumbers: Boolean(argv["disable-line-numbers"]),
  };
}
