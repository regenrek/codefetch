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
} from "./config.js";
export { countTokens } from "./token-counter.js";
export { VALID_PROMPTS, VALID_ENCODERS, VALID_LIMITERS } from "./constants.js";

// Markdown utilities (pure JS, Worker-safe)
export { generateMarkdown } from "./markdown.js";
export {
  generateMarkdownFromContent,
  type FileContent,
  type MarkdownFromContentOptions,
} from "./markdown-content.js";

// Web fetch functionality (Worker-safe)
export {
  fetchFromWeb,
  type WebFetchConfig,
  type CrawlOptions,
  type CrawlResult,
} from "./web/index.js";

// HTML to Markdown conversion (Worker-safe)
export { htmlToMarkdown } from "./web/html-to-markdown.js";

// Tree utilities (Worker-safe)
export { generateProjectTree } from "./tree.js";
export { collectFilesAsTree } from "./files-tree.js";
export type { FileNode, FetchResult } from "./types.js";

// Prompt templates (Worker-safe)
export * from "./prompts/index.js";

// Environment detection
export { isCloudflareWorker, getCacheSizeLimit } from "./env.js";

// Note: The following are NOT exported as they require Node.js APIs:
// - collectFiles (requires fs)
// - fetchFiles (requires fs)
// - Local file operations from files.ts
// - Git clone functionality (requires child_process)
