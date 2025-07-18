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

// HTML to Markdown conversion (Worker-safe)
export { htmlToMarkdown } from "./web/html-to-markdown.js";

// GitHub tarball extraction (uses native DecompressionStream)
export { streamGitHubTarball } from "./web/github-tarball.js";

// Types (Worker-safe)
export type { FileNode, FetchResult, FetchMetadata } from "./types.js";
export { FetchResultImpl } from "./fetch-result.js";

// Prompt templates (Worker-safe)
export * from "./prompts/index.js";

// Environment detection
export { isCloudflareWorker, getCacheSizeLimit } from "./env.js";

// Note: The following are NOT exported as they require Node.js APIs:
// - collectFiles (requires fs)
// - generateMarkdown (requires fs for file reading)
// - generateProjectTree (requires fs)
// - collectFilesAsTree (requires fs)
// - File operations from local filesystem
// - Git clone operations
