import mri from "mri";
import { resolve } from "pathe";
import type { TokenEncoder, TokenLimiter } from "codefetch-sdk";
import { VALID_PROMPTS, VALID_ENCODERS, VALID_LIMITERS } from "codefetch-sdk";

export function parseArgs(args: string[]) {
  const argv = mri(args, {
    alias: {
      o: "output",
      e: "extension",
      v: "verbose",
      t: "project-tree",
      d: "dry-run",
      p: "prompt",
      c: "token-count-only",
    },
    boolean: [
      "dry-run",
      "disable-line-numbers",
      "token-count-only",
      "no-cache",
      "no-api",
      "ignore-robots",
      "ignore-cors",
    ],
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
      "url",
      "cache-ttl",
      "branch",
      "github-token",
      "format",
      "max-pages",
      "max-depth",
      "ignore-robots",
      "ignore-cors",
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

  if (argv["token-limiter"] && !VALID_LIMITERS.has(argv["token-limiter"])) {
    throw new Error(
      `Invalid token limiter. Must be one of: ${[...VALID_LIMITERS].join(", ")}`
    );
  }

  // handle --prompt & -p (if only -p then use default)
  // set argv.prompt to undefined if true then its get overwritten by config default prpmpt
  const defaultPromptFile = argv.prompt === "" ? undefined : argv.prompt;
  if (defaultPromptFile !== undefined) {
    const isValidPrompt =
      VALID_PROMPTS.has(argv.prompt) || /\.(md|txt)$/.test(argv.prompt);

    if (!isValidPrompt) {
      throw new Error(
        `Invalid prompt. Must be one of: ${[...VALID_PROMPTS].join(", ")} or a file with .md/.txt extension`
      );
    }
  }

  // --var message="hi world" --var custom="John Doe"
  const templateVars: Record<string, string> = {};
  if (argv.var) {
    const varArgs = Array.isArray(argv.var) ? argv.var : [argv.var];

    for (const varArg of varArgs) {
      const [key, ...valueParts] = varArg.split("=");
      const value = valueParts.join("="); // Handle values that might contain =
      if (key && value) {
        templateVars[key.toUpperCase()] = value;
      }
    }
  }

  // Handle MESSAGE variable for built-in prompts (e.g., -p fix "message")
  if (argv.prompt && VALID_PROMPTS.has(argv.prompt) && argv._.length > 0) {
    templateVars.MESSAGE = argv._.join(" ");
  }

  // Strip "codefetch/" prefix from output file if present to avoid double-nesting
  let outputFile = argv.output;
  if (outputFile) {
    // Remove leading "codefetch/" or "./codefetch/" to prevent double-nesting
    outputFile = outputFile.replace(/^(\.\/)?codefetch\//, "");
  }

  return {
    ...(outputFile && { outputFile }),
    ...(argv["output-path"] && { outputPath: resolve(argv["output-path"]) }),
    ...(extensions && { extensions }),
    ...(argv["include-files"] && {
      includeFiles: splitValues(argv["include-files"]),
    }),
    ...(argv["exclude-files"] && {
      excludeFiles: splitValues(argv["exclude-files"]),
    }),
    ...(argv["include-dir"] && {
      includeDirs: normalizeDirs(argv["include-dir"]),
    }),
    ...(argv["exclude-dir"] && {
      excludeDirs: normalizeDirs(argv["exclude-dir"]),
    }),
    ...(argv["max-tokens"] && { maxTokens: Number(argv["max-tokens"]) }),
    ...(argv["token-encoder"] && {
      tokenEncoder: argv["token-encoder"] as TokenEncoder,
    }),
    ...(argv["token-limiter"] && {
      tokenLimiter: argv["token-limiter"] as TokenLimiter,
    }),
    ...(defaultPromptFile && { defaultPromptFile }),
    ...(Object.keys(templateVars).length > 0 && { templateVars }),
    verbose: argv.verbose === undefined ? 1 : Number(argv.verbose),
    projectTree: treeDepth,

    dryRun: Boolean(argv["dry-run"]),
    disableLineNumbers: Boolean(argv["disable-line-numbers"]),
    tokenCountOnly: Boolean(argv["token-count-only"]),
    ...(argv.format && { format: argv.format as "markdown" | "json" }),

    // Git repository flags
    ...(argv.url && { url: String(argv.url) }),
    ...(argv["cache-ttl"] && { cacheTTL: Number(argv["cache-ttl"]) }),
    ...(argv.branch && { branch: String(argv.branch) }),
    noCache: argv.cache === false, // mri converts --no-cache to cache: false
    noApi: argv.api === false, // mri converts --no-api to api: false
    ...(argv["github-token"] && { githubToken: String(argv["github-token"]) }),

    // Web crawling flags
    ...(argv["max-pages"] && { maxPages: Number(argv["max-pages"]) }),
    ...(argv["max-depth"] && { maxDepth: Number(argv["max-depth"]) }),
    ignoreRobots: Boolean(argv["ignore-robots"]),
    ignoreCors: Boolean(argv["ignore-cors"]),
  };
}
