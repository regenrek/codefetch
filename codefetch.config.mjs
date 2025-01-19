/** @type {import('codefetch').CodefetchConfig} */
export default {
  outputPath: "codefetch",
  outputFile: "codebase.md",
  maxTokens: 999_000,
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
};
