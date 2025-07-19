/**
 * Browser-safe entry point for codefetch-sdk
 *
 * This module exports only the APIs that work in browser environments:
 * - No Node.js built-in modules (fs, path, os, etc.)
 * - No process.env access
 * - Only pure JavaScript utilities
 */

// Core types and result classes (browser-safe)
export { FetchResultImpl } from "./fetch-result.js";
export type {
  FileNode,
  FetchResult,
  FetchMetadata,
  TokenEncoder,
} from "./types.js";

// Token counting (browser-safe)
export { countTokens, SUPPORTED_MODELS } from "./token-counter.js";

// Markdown utilities (browser-safe, only the content-based version)
export {
  generateMarkdownFromContent,
  type FileContent,
  type MarkdownFromContentOptions,
} from "./markdown-content.js";

// Browser-safe utilities
export { detectLanguage } from "./utils-browser.js";

// Constants (browser-safe)
export { VALID_PROMPTS, VALID_ENCODERS, VALID_LIMITERS } from "./constants.js";

// Prompt templates (browser-safe)
export * from "./prompts/index.js";
export { prompts } from "./prompts/index.js";

// Browser-safe fetch function that only works with URLs
export { fetchFromWebWorker as fetch } from "./web/sdk-web-fetch-worker.js";

// Note: The following are NOT exported as they require Node.js APIs:
// - Config loading (requires fs)
// - File collection (requires fs)
// - Tree generation (requires fs)
// - collectFilesAsTree (requires fs)
// - generateMarkdown (requires fs)
// - findProjectRoot (requires fs)
// - Web fetching (requires Node.js modules in current implementation)
// - GitHub API (requires os.tmpdir and process.env)
