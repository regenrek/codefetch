import type { CodefetchConfig } from "codefetch";

export default {
  outputPath: "codefetch",
  outputFile: "codebase.md",
  maxTokens: 999_000,
  verbose: 1,
  projectTree: 2,
  defaultIgnore: true,
  gitignore: true,
  tokenEncoder: "simple",
  trackedModels: [
    "chatgpt-4o-latest",
    "claude-3-5-sonnet-20241022",
    "o1",
    "deepseek-v3",
    "gemini-exp-1206",
  ],
  includeDirs: ["src", "test"],
  excludeDirs: ["test/fixtures"],
  dryRun: false,
  disableLineNumbers: false,
} satisfies Partial<CodefetchConfig>;
