import { resolve } from "pathe";
import type { TokenEncoder, TokenLimiter, OutputFormat } from "./types";
import { defu } from "defu";

export interface CodefetchConfig {
  outputFile: string;
  outputPath: string;
  maxTokens: number;
  includeFiles?: string[];
  excludeFiles?: string[];
  includeDirs?: string[];
  excludeDirs?: string[];
  verbose: number;
  extensions?: string[];
  defaultIgnore: boolean;
  gitignore: boolean;
  projectTree: number;
  projectTreeSkipIgnoreFiles: boolean;
  tokenEncoder: TokenEncoder;
  tokenLimiter: TokenLimiter;
  trackedModels?: string[];
  dryRun?: boolean;
  disableLineNumbers?: boolean;
  tokenCountOnly?: boolean;
  noSummary?: boolean;
  defaultPromptFile: string;
  inlinePrompt?: string; // Direct prompt string instead of file
  defaultChat?: string;
  templateVars?: Record<string, string>;
  format?: OutputFormat;
}

const defaultOutput = "codebase.md";

export const getDefaultConfig = (): CodefetchConfig => ({
  outputPath: "codefetch",
  outputFile: defaultOutput,
  maxTokens: 999_000, // safety
  verbose: 1,
  projectTree: 2,
  projectTreeSkipIgnoreFiles: false,
  defaultIgnore: true,
  gitignore: true,
  tokenEncoder: "simple",
  tokenLimiter: "truncated",
  trackedModels: [],
  dryRun: false,
  disableLineNumbers: true, // Line numbers disabled by default to save tokens
  tokenCountOnly: false,
  noSummary: false,
  defaultPromptFile: "default.md",
  defaultChat: "https://chat.com",
  templateVars: {},
  format: "markdown",
});

export async function resolveCodefetchConfig(
  config: CodefetchConfig,
  cwd: string
): Promise<CodefetchConfig> {
  const resolved = { ...config };

  if (typeof resolved.outputPath === "string") {
    resolved.outputPath = resolve(cwd, resolved.outputPath);
  }

  // Resolve paths for include/exclude patterns
  if (resolved.includeFiles) {
    resolved.includeFiles = resolved.includeFiles.map((pattern) =>
      resolve(cwd, pattern)
    );
  }
  if (resolved.excludeFiles) {
    resolved.excludeFiles = resolved.excludeFiles.map((pattern) =>
      resolve(cwd, pattern)
    );
  }
  if (resolved.includeDirs) {
    resolved.includeDirs = resolved.includeDirs.map((pattern) =>
      resolve(cwd, pattern)
    );
  }
  if (resolved.excludeDirs) {
    resolved.excludeDirs = resolved.excludeDirs.map((pattern) =>
      resolve(cwd, pattern)
    );
  }

  return resolved;
}

// Helper to merge CLI args with config file - improved array handling
export function mergeWithCliArgs(
  config: CodefetchConfig,
  cliArgs: Partial<CodefetchConfig>
): CodefetchConfig {
  const mergeArrays = <T>(a?: T[], b?: T[]): T[] => {
    if (!a && !b) return [];
    if (!a) return b || [];
    if (!b) return a;
    return [...new Set([...a, ...b])]; // Deduplicate arrays
  };

  return {
    ...config,
    ...cliArgs,
    includeFiles: mergeArrays(config.includeFiles, cliArgs.includeFiles),
    excludeFiles: mergeArrays(config.excludeFiles, cliArgs.excludeFiles),
    includeDirs: mergeArrays(config.includeDirs, cliArgs.includeDirs),
    excludeDirs: mergeArrays(config.excludeDirs, cliArgs.excludeDirs),
  };
}

// Custom merger that replaces trackedModels instead of merging
export function createCustomConfigMerger() {
  return (obj: any, defaults: any) => {
    // If obj has trackedModels or prompt, use them instead of merging
    const result = defu(obj, defaults);
    if (obj && obj.trackedModels) {
      result.trackedModels = obj.trackedModels;
    }
    if (obj && obj.prompt !== undefined) {
      result.prompt = obj.prompt;
    }
    return result;
  };
}
