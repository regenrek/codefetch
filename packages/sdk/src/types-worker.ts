/**
 * Worker-safe type definitions
 * These types are duplicated here to avoid importing from modules with Node.js dependencies
 */

import type { CodefetchConfig } from "./config-worker.js";
import type { OutputFormat } from "./types.js";

export type CacheStrategy =
  | "auto" // Use cache if available (default)
  | "force" // Always use cache, fail if not available
  | "bypass" // Skip cache completely
  | "refresh" // Invalidate cache and fetch fresh
  | "validate"; // Check if cache is still valid

export interface FetchOptions extends Partial<CodefetchConfig> {
  source?: string; // URL or local path, defaults to cwd
  format?: OutputFormat;

  // Cache control options
  cache?: boolean | CacheStrategy;
  cacheKey?: string;
  cacheTTL?: number; // in seconds
  cacheNamespace?: string;

  // For Cloudflare Workers
  cacheBaseUrl?: string;

  // Bypass cache completely
  noCache?: boolean;
}
