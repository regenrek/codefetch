/**
 * Cloudflare Worker-compatible entry point for codefetch-sdk
 *
 * This module exports only Worker-safe APIs:
 * - No Node.js built-in modules (fs, path, os, etc.)
 * - No direct process.env access
 */

// Worker-specific configuration utilities
export {
  getDefaultConfig,
  resolveCodefetchConfig,
  mergeWithCliArgs,
  type CodefetchConfig,
} from "./config-worker.js";

// Environment detection helpers
export { isCloudflareWorker, getCacheSizeLimit } from "./env.js";

// High-level unified fetch API for Workers
export {
  fetchFromWebWorker as fetchFromWeb,
  fetchFromWebWorker as fetch,
} from "./web/sdk-web-fetch-worker.js";

// Streaming helpers and GitHub tarball streaming
export {
  streamGitHubFiles,
  createMarkdownStream,
  createTransformStream,
  collectStream,
  filterStream,
  mapStream,
} from "./streaming.js";

// Direct tarball streaming helpers (GitHub / GitLab)
export { streamGitHubFiles as streamGitHubTarball } from "./web/github-tarball.js";
export { streamGitLabFiles } from "./web/gitlab-tarball.js";

// Core markdown + HTML utilities
export {
  generateMarkdownFromContent,
  type FileContent,
} from "./markdown-content.js";
export { htmlToMarkdown } from "./web/html-to-markdown.js";

// Core result + types
export { FetchResultImpl } from "./fetch-result.js";
export type { FetchResult, FetchMetadata, FileNode } from "./types.js";

// Token counting
export { countTokens } from "./token-counter.js";

// Constants and prompts
export { VALID_PROMPTS, VALID_ENCODERS, VALID_LIMITERS } from "./constants.js";
export * as prompts from "./prompts/index.js";
export {
  codegenPrompt,
  fixPrompt,
  improvePrompt,
  testgenPrompt,
} from "./prompts/index.js";

// Worker cache helpers
export {
  fetchFromWebCached,
  deleteFromCache,
  clearCache,
  createCacheStorage,
  withCache,
} from "./cache-enhanced.js";

// Browser-style utilities
export { detectLanguage } from "./utils-browser.js";

// Type guards and branded helpers
export {
  isValidGitHubUrl,
  isValidRepoPath,
  isValidGitHubToken,
  isValidSemVer,
  createGitHubToken,
  createRepoPath,
  createGitHubUrl,
  isNotNull,
  isArray,
  isObject,
  isString,
  isNumber,
  assertDefined,
  assert,
  exhaustiveCheck,
} from "./type-guards.js";

// Error classes & guards
export {
  CodefetchError,
  GitHubError,
  TokenLimitError,
  ParseError,
  NetworkError,
  ConfigError,
  CacheError,
  URLValidationError,
  isCodefetchError,
  isGitHubError,
  isTokenLimitError,
  wrapError,
} from "./errors.js";
