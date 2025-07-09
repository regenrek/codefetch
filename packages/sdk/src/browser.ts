/**
 * Browser-safe entry point for @codefetch/sdk
 *
 * This module exports only the APIs that work in browser environments:
 * - No Node.js built-in modules (fs, path, os, etc.)
 * - No process.env access
 * - Only pure JavaScript utilities
 */

// Core types and result classes (browser-safe)
export { FetchResultImpl } from "./fetch-result.js";
export type { FileNode, FetchResult, FetchMetadata } from "./types.js";

// Token counting (browser-safe)
export { countTokens } from "./token-counter.js";

// Tree visualization (browser-safe)
export { generateProjectTree } from "./tree.js";
export { collectFilesAsTree } from "./files-tree.js";

// Markdown utilities (browser-safe)
export { generateMarkdown } from "./markdown.js";
export {
  generateMarkdownFromContent,
  type FileContent,
  type MarkdownFromContentOptions,
} from "./markdown-content.js";

// Constants (browser-safe)
export { VALID_PROMPTS, VALID_ENCODERS, VALID_LIMITERS } from "./constants.js";

// Prompt templates (browser-safe)
export * from "./prompts/index.js";
export { prompts } from "./prompts/index.js";

// Note: The following are NOT exported as they require Node.js APIs:
// - Config loading (requires fs)
// - File collection (requires fs)
// - Web fetching (requires Node.js modules in current implementation)
// - GitHub API (requires os.tmpdir and process.env)
