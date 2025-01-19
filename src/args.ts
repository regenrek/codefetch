import mri from "mri";
import { resolve } from "pathe";
import type { TokenEncoder, TokenLimiter } from "./types";

const VALID_ENCODERS = new Set(["simple", "p50k", "o200k", "cl100k"]);
const RESERVED_PROMPTS = new Set([
  "default",
  "fix",
  "improve",
  "testgen",
  "codegen",
]);

export function printHelp() {
  console.log(`
Usage: codefetch [command] [options]

Commands:
  init                        Initialize a new codefetch project
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
  --token-limiter <type>      Token limiting strategy (sequential, truncated)
  --disable-line-numbers      Disable line numbers in output
  -h, --help                  Display this help message
  -p, --prompt <type>         Add a default prompt (dev, architect, tester) or add a custom prompt file with .md/.txt extension
`);
}

function parseTemplateVars(argv: mri.Argv): Record<string, string> {
  const vars: Record<string, string> = {};

  // Only process vars if we have a prompt
  if (!argv.prompt) {
    return vars;
  }

  // Handle direct message after prompt as MESSAGE var
  // removed - this is problematic for @default.ts rawArgs handling
  // and also not a good standard for prompts
  // if (Array.isArray(argv._) && argv._.length > 0) {
  //   vars.MESSAGE = argv._[0] as string;
  // }

  // Handle --var flag(s)
  if (argv.var) {
    const varArgs = Array.isArray(argv.var) ? argv.var : [argv.var];

    for (const varArg of varArgs) {
      const [key, ...valueParts] = varArg.split("=");
      const value = valueParts.join("="); // Handle values that might contain =
      if (key && value) {
        vars[key.toUpperCase()] = value;
      }
    }
  }

  return vars;
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
      p: "prompt",
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
      "token-limiter",
      "prompt",
      "var",
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
    ? (() => {
        const input = String(argv.extension);
        // Validate format: either "ts,js,png" or ".ts,.js,.png"
        const isValid =
          /^(\.[a-z\d]+,)*\.[a-z\d]+$|^([a-z\d]+,)*[a-z\d]+$/i.test(input);

        if (!isValid) {
          throw new Error(
            "Invalid extension format. Use: ts,js,png or .ts,.js,.png"
          );
        }

        return input
          .split(",")
          .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));
      })()
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

  if (
    argv["token-limiter"] &&
    !["sequential", "truncated"].includes(argv["token-limiter"])
  ) {
    throw new Error(
      'Invalid token limiter. Must be either "sequential" or "truncated"'
    );
  }

  // Handle prompt and template vars
  const promptConfig = argv.prompt
    ? (() => {
        const promptValue = argv.prompt === true ? "default" : argv.prompt;
        if (
          !RESERVED_PROMPTS.has(promptValue) &&
          !promptValue.endsWith(".md") &&
          !promptValue.endsWith(".txt")
        ) {
          throw new Error(
            `Invalid prompt. Must be one of: ${[...RESERVED_PROMPTS].join(
              ", "
            )} or a file with .md/.txt extension`
          );
        }
        return {
          prompt: promptValue,
          templateVars: parseTemplateVars(argv),
        };
      })()
    : { prompt: undefined, templateVars: {} };

  return {
    output: argv.output || undefined,
    outputPath: argv["output-path"] ? resolve(argv["output-path"]) : undefined,
    dir: argv.dir ? resolve(argv.dir) : undefined,
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
    tokenLimiter: (argv["token-limiter"] || undefined) as
      | TokenLimiter
      | undefined,
    dryRun: Boolean(argv["dry-run"]),
    disableLineNumbers: Boolean(argv["disable-line-numbers"]),
    ...promptConfig,
  };
}
