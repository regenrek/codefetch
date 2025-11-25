/** @type {import('codefetch').CodefetchConfig} */
export default {
  outputPath: "codefetch",
  outputFile: "codebase.md",
  maxTokens: 999_000,
  verbose: 1,
  projectTree: 5,
  projectTreeSkipIgnoreFiles: false,
  defaultIgnore: true,
  gitignore: true,
  tokenEncoder: "simple",
  tokenLimiter: "truncated",
  dryRun: false,
  disableLineNumbers: false,
  defaultPromptFile: undefined,
  defaultChat: "https://chat.com",
  templateVars: {},
};
