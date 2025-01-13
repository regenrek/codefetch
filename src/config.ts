import { loadConfig } from "c12";
import { resolve } from "node:path";
import type { TokenEncoder } from "./types";

export interface CodefetchConfig {
  outputPath: string;
  maxTokens: number;
  verbose: number;
  outputFile: string;
  extensions?: string[];
  includeFiles?: string[];
  excludeFiles?: string[];
  includeDirs?: string[];
  excludeDirs?: string[];
  defaultIgnore: boolean;
  gitignore: boolean;
  help?: boolean;
  projectTree: number;
  tokenEncoder: TokenEncoder;
  trackedModels?: string[];
  dryRun?: boolean;
}

const defaultOutput = "codebase.md";
const getDefaultConfig = (): CodefetchConfig => ({
  outputPath: "codefetch",
  outputFile: defaultOutput,
  maxTokens: 500_000, // safety
  verbose: 1,
  projectTree: 2,
  defaultIgnore: true,
  gitignore: true,
  tokenEncoder: "simple",
  trackedModels: [
    "gpt-4o-latest",
    "claude-3-5-sonnet-20241022",
    "o1",
    "gemini-exp-1206",
  ],
  dryRun: false,
});

export async function loadCodefetchConfig(
  cwd: string,
  overrides?: Partial<CodefetchConfig>
): Promise<CodefetchConfig> {
  const defaults = getDefaultConfig();

  const { config } = await loadConfig<CodefetchConfig>({
    name: "codefetch",
    cwd,
    defaults,
    overrides: overrides as CodefetchConfig,
  });

  return await resolveCodefetchConfig(config, cwd);
}

export async function resolveCodefetchConfig(
  config: CodefetchConfig,
  cwd: string
) {
  if (typeof config.outputPath === "string") {
    config.outputPath = resolve(cwd, config.outputPath);
  }

  // Resolve paths for include/exclude patterns
  if (config.includeFiles) {
    config.includeFiles = config.includeFiles.map((pattern) =>
      resolve(cwd, pattern)
    );
  }
  if (config.excludeFiles) {
    config.excludeFiles = config.excludeFiles.map((pattern) =>
      resolve(cwd, pattern)
    );
  }
  if (config.includeDirs) {
    config.includeDirs = config.includeDirs.map((pattern) =>
      resolve(cwd, pattern)
    );
  }
  if (config.excludeDirs) {
    config.excludeDirs = config.excludeDirs.map((pattern) =>
      resolve(cwd, pattern)
    );
  }

  return config;
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
