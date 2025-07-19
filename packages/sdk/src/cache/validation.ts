/**
 * Content validation for cached entries
 */

import { stat } from "node:fs/promises";
import { CachedResult } from "./interface.js";
import { isCloudflareWorker } from "../env.js";

/**
 * Validate that cached content is still valid and accessible
 */
export async function validateCachedContent(
  cached: CachedResult
): Promise<boolean> {
  if (!cached || !cached.content) {
    return false;
  }

  // For file system paths - only validate in Node.js environment
  if (
    cached.type === "filesystem" &&
    cached.content.path &&
    !isCloudflareWorker
  ) {
    try {
      await stat(cached.content.path);
      return true;
    } catch {
      // Path no longer exists
      return false;
    }
  }

  // For in-memory content
  if (cached.type === "memory" && cached.content) {
    return true;
  }

  // For serialized content
  if (cached.type === "serialized" && cached.content) {
    return true;
  }

  // Check expiration
  if (cached.metadata?.expiresAt) {
    const expiresAt = new Date(cached.metadata.expiresAt);
    if (expiresAt <= new Date()) {
      return false;
    }
  }

  return true;
}

/**
 * Generate a cache key from source and options
 */
export function generateCacheKey(source: string, options: any = {}): string {
  const parts = [source];

  if (options) {
    // Add relevant options to cache key
    if (options.format) parts.push(`format:${options.format}`);
    if (options.maxTokens) parts.push(`tokens:${options.maxTokens}`);
    if (options.tokenEncoder) parts.push(`encoder:${options.tokenEncoder}`);
    if (options.extensions?.length) {
      parts.push(`ext:${options.extensions.sort().join(",")}`);
    }
    if (options.excludeDirs?.length) {
      parts.push(`exclude:${options.excludeDirs.sort().join(",")}`);
    }
  }

  return parts.join("|");
}
