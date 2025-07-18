/**
 * Cloudflare Worker-compatible entry point for @codefetch/sdk
 *
 * This module re-exports only the APIs that work within Worker constraints:
 * - No local file system access
 * - No child_process (git clone)
 * - Limited to ephemeral TmpFS storage (10MB)
 */

// Core utilities that are Worker-safe
export {
  getDefaultConfig,
  resolveCodefetchConfig,
  mergeWithCliArgs,
  type CodefetchConfig,
} from "./config-worker.js";
export { countTokens } from "./token-counter.js";
export { VALID_PROMPTS, VALID_ENCODERS, VALID_LIMITERS } from "./constants.js";

// Markdown utilities (Worker-safe version that uses in-memory content)
export {
  generateMarkdownFromContent,
  type FileContent,
  type MarkdownFromContentOptions,
} from "./markdown-content.js";

// Worker-safe web fetch functionality
export { fetchFromWebWorker as fetchFromWeb } from "./web/sdk-web-fetch-worker.js";
export type { WebFetchConfig, CrawlOptions, CrawlResult } from "./web/types.js";

// Re-export FetchOptions from fetch.ts
export type { FetchOptions } from "./fetch.js";

// Types (Worker-safe) - Export all types that were missing
export type {
  FileNode,
  FetchResult,
  FetchMetadata,
  PerformanceMetrics,
  TokenEncoder,
  TokenLimiter,
  OutputFormat,
} from "./types.js";
export { FetchResultImpl } from "./fetch-result.js";

// Prompt templates (Worker-safe)
export * from "./prompts/index.js";

// Tree utilities (Worker-safe)
export {
  filesToTree,
  treeToFiles,
  findNodeByPath,
  walkTree,
  calculateTreeMetrics,
  sortTree,
  filterTree,
} from "./tree-utils.js";

// Environment detection
export { isCloudflareWorker, getCacheSizeLimit } from "./env.js";

// Utility functions (Worker-safe)
export { detectLanguage } from "./utils-browser.js";

// Error classes (Worker-safe)
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

// Streaming APIs (Worker-safe)
export {
  streamGitHubFiles,
  createMarkdownStream,
  createTransformStream,
  collectStream,
  filterStream,
  mapStream,
  type StreamOptions,
} from "./streaming.js";

// HTML to Markdown conversion (Worker-safe)
export { htmlToMarkdown } from "./web/html-to-markdown.js";

// GitHub tarball extraction (uses native DecompressionStream)
export { fetchGitHubTarball } from "./web/github-tarball.js";

// Enhanced cache integration (Worker-safe)
export {
  fetchFromWebCached,
  deleteFromCache,
  clearCache,
  createCacheStorage,
  withCache,
  type CacheOptions,
  type CacheStorage,
} from "./cache-enhanced.js";

// Migration helpers (Worker-safe)
export {
  migrateFromV1,
  compat,
  generateMigrationGuide,
  needsMigration,
  autoMigrateCode,
} from "./migration.js";

// Type guards and branded types (Worker-safe)
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
  type GitHubToken,
  type RepoPath,
  type GitHubUrl,
  type SemVer,
} from "./type-guards.js";

// Note: The following are NOT exported as they require Node.js APIs:
// - collectFiles (requires fs)
// - generateMarkdown (requires fs for file reading)
// - generateProjectTree (requires fs)
// - collectFilesAsTree (requires fs)
// - File operations from local filesystem
// - Git clone operations
