export const VALID_PROMPTS = new Set([
  "default",
  "fix",
  "improve",
  "testgen",
  "codegen",
]);

export const VALID_ENCODERS = new Set(["simple", "p50k", "o200k", "cl100k"]);

export const VALID_LIMITERS = new Set(["sequential", "truncated"]);
