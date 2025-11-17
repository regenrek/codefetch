/**
 * Worker-specific cache factory that only includes browser-safe implementations
 */

import { CacheInterface, CacheOptions } from "./interface.js";
import { CloudflareCache } from "./cloudflare-cache.js";
import { MemoryCache } from "./memory-cache.js";

/**
 * Create a cache instance for Worker environments
 * Only includes CloudflareCache and MemoryCache (no FileSystemCache)
 */
export async function createCache(
  options?: CacheOptions
): Promise<CacheInterface> {
  // Check for Cloudflare Workers environment
  if (
    (globalThis as any).caches !== undefined &&
    (globalThis as any).caches?.default
  ) {
    return new CloudflareCache(options);
  }

  // Default to in-memory cache for other environments
  return new MemoryCache(options);
}
