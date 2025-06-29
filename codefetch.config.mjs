/** @type {import('codefetch').CodefetchConfig} */
export default {
  outputPath: "codefetch",
  outputFile: "codebase.md",
  maxTokens: 999_000,
  verbose: 1,
  projectTree: 5,
  defaultIgnore: true,
  gitignore: true,
  tokenEncoder: "simple",
  tokenLimiter: "truncated",
  trackedModels: ["o3", "gemini-2.5-pro", "claude-sonnet-4", "claude-opus-4"],
  dryRun: false,
  disableLineNumbers: false,
  defaultPromptFile: undefined,
  defaultChat: "https://chat.com",
  templateVars: {},
};
