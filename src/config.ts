import { loadConfig } from "c12";
import { resolve } from "pathe";
import type { TokenEncoder, TokenLimiter } from "./types";
import { defu } from "defu";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

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
  tokenLimiter: TokenLimiter;
  trackedModels?: string[];
  dryRun?: boolean;
  disableLineNumbers?: boolean;
  prompt?: string;
  defaultChat?: string;
  templateVars?: Record<string, string>;
}

const defaultOutput = "codebase.md";
export const getDefaultConfig = (): CodefetchConfig => ({
  outputPath: "codefetch",
  outputFile: defaultOutput,
  maxTokens: 999_000, // safety
  verbose: 1,
  projectTree: 2,
  defaultIgnore: true,
  gitignore: true,
  tokenEncoder: "simple",
  tokenLimiter: "truncated",
  trackedModels: [
    "chatgpt-4o-latest",
    "claude-3-5-sonnet-20241022",
    "o1",
    "deepseek-v3",
    "gemini-exp-1206",
  ],
  dryRun: false,
  disableLineNumbers: false,
  prompt: undefined,
  defaultChat: "https://chat.com",
  templateVars: {},
});

const VALID_PROMPTS = new Set(["dev", "architect", "tester"]);

async function resolvePrompt(
  promptName: string | undefined,
  cwd: string
): Promise<string | undefined> {
  if (!promptName) {
    return undefined;
  }

  // Check for default prompt when only -p is used
  if (promptName === "default") {
    const defaultPath = resolve(cwd, "codefetch/prompts/default.md");
    if (existsSync(defaultPath)) {
      return await readFile(defaultPath, "utf8");
    }
    return undefined;
  }

  // Check built-in prompts
  if (VALID_PROMPTS.has(promptName)) {
    try {
      const { default: promptContent } = await import(
        `../prompts/${promptName}.ts`
      );
      return promptContent;
    } catch {
      throw new Error(`Built-in prompt "${promptName}" not found`);
    }
  }

  // Check for custom prompts in codefetch/prompts
  if (promptName.endsWith(".md") || promptName.endsWith(".txt")) {
    const customPath = resolve(cwd, "codefetch/prompts", promptName);
    if (existsSync(customPath)) {
      return await readFile(customPath, "utf8");
    }
    throw new Error(`Custom prompt file not found: ${promptName}`);
  }

  return undefined;
}

export async function loadCodefetchConfig(
  cwd: string,
  overrides?: Partial<CodefetchConfig>
): Promise<CodefetchConfig> {
  const defaults = getDefaultConfig();

  // Custom merger that replaces trackedModels instead of merging
  const customMerger = (obj: any, defaults: any) => {
    // If obj has trackedModels or prompt, use them instead of merging
    const result = defu(obj, defaults);
    if (obj.trackedModels) {
      result.trackedModels = obj.trackedModels;
    }
    if (obj.prompt !== undefined) {
      result.prompt = obj.prompt;
    }
    return result;
  };

  const { config } = await loadConfig<CodefetchConfig>({
    name: "codefetch",
    cwd,
    defaults,
    overrides: overrides as CodefetchConfig,
    merger: customMerger,
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

  if (config.prompt) {
    const promptContent = await resolvePrompt(config.prompt, cwd);
    if (promptContent) {
      config.prompt = promptContent;
    } else if (config.prompt === "default") {
      // If default prompt was requested but not found, silently continue
      config.prompt = undefined;
    }
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

export async function getConfig(
  overrides?: Partial<CodefetchConfig>
): Promise<CodefetchConfig> {
  const cwd = process.cwd();
  return await loadCodefetchConfig(cwd, overrides);
}