/**
 * Worker-safe configuration utilities
 * No file system operations, only in-memory config handling
 */

// Define CodefetchConfig interface for Workers
export interface CodefetchConfig {
  format: "markdown" | "json";
  extensions: string[];
  excludeFiles: string[];
  includeFiles: string[];
  excludeDirs: string[];
  includeDirs: string[];
  verbose: number;
  projectTree: number;
  projectTreeSkipIgnoreFiles?: boolean;
  dryRun: boolean;
  maxTokens: number;
  tokenEncoder: string;
  disableLineNumbers: boolean;
  defaultIgnore: boolean;
  gitignore: boolean;
  tokenLimiter: string;
  tokenCountOnly: boolean;
  noSummary?: boolean;
  promptFile?: string;
  prompt?: string;
  templateVars: Record<string, string>;
}

/**
 * Get default configuration for Workers
 */
export function getDefaultConfig(): CodefetchConfig {
  return {
    format: "markdown",
    extensions: [],
    excludeFiles: [],
    includeFiles: [],
    excludeDirs: [],
    includeDirs: [],
    verbose: 0,
    projectTree: 0,
    projectTreeSkipIgnoreFiles: false,
    dryRun: false,
    maxTokens: 50_000,
    tokenEncoder: "cl100k",
    disableLineNumbers: false,
    defaultIgnore: true,
    gitignore: false, // No file system access in Workers
    tokenLimiter: "truncated",
    tokenCountOnly: false,
    templateVars: {},
  };
}

/**
 * Resolve configuration in Workers (no file system)
 */
export async function resolveCodefetchConfig(
  cwd?: string,
  overrides?: Partial<CodefetchConfig>
): Promise<CodefetchConfig> {
  // In Workers, we can't read config files from disk
  // Just return defaults merged with overrides
  const defaults = getDefaultConfig();
  return {
    ...defaults,
    ...overrides,
  };
}

/**
 * Merge configuration with CLI arguments
 */
export function mergeWithCliArgs(
  config: CodefetchConfig,
  args: any
): CodefetchConfig {
  const merged = { ...config };

  // Override with CLI args if provided
  if (args.format !== undefined) merged.format = args.format;
  if (args.extensions !== undefined) merged.extensions = args.extensions;
  if (args.excludeFiles !== undefined) merged.excludeFiles = args.excludeFiles;
  if (args.includeFiles !== undefined) merged.includeFiles = args.includeFiles;
  if (args.excludeDirs !== undefined) merged.excludeDirs = args.excludeDirs;
  if (args.includeDirs !== undefined) merged.includeDirs = args.includeDirs;
  if (args.verbose !== undefined) merged.verbose = args.verbose;
  if (args.projectTree !== undefined) merged.projectTree = args.projectTree;
  if (args.projectTreeSkipIgnoreFiles !== undefined)
    merged.projectTreeSkipIgnoreFiles = args.projectTreeSkipIgnoreFiles;
  if (args.dryRun !== undefined) merged.dryRun = args.dryRun;
  if (args.maxTokens !== undefined) merged.maxTokens = args.maxTokens;
  if (args.tokenEncoder !== undefined) merged.tokenEncoder = args.tokenEncoder;
  if (args.disableLineNumbers !== undefined)
    merged.disableLineNumbers = args.disableLineNumbers;
  if (args.defaultIgnore !== undefined)
    merged.defaultIgnore = args.defaultIgnore;
  if (args.tokenLimiter !== undefined) merged.tokenLimiter = args.tokenLimiter;
  if (args.tokenCountOnly !== undefined)
    merged.tokenCountOnly = args.tokenCountOnly;
  if (args.promptFile !== undefined) merged.promptFile = args.promptFile;
  if (args.prompt !== undefined) merged.prompt = args.prompt;

  // Merge template vars
  if (args.templateVars) {
    merged.templateVars = {
      ...merged.templateVars,
      ...args.templateVars,
    };
  }

  return merged;
}
