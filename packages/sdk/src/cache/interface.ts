/**
 * Cache interface for universal cache implementation
 */

export interface CachedResult {
  metadata: CacheMetadata;
  content: any;
  type?: "filesystem" | "memory" | "serialized";
}

export interface CacheMetadata {
  url: string;
  fetchedAt: string;
  expiresAt: string;
  contentType?: string;
  headers?: Record<string, string>;
}

export interface CacheOptions {
  namespace?: string;
  ttl?: number; // in seconds
  baseUrl?: string; // For Cloudflare Workers
  maxSize?: number; // in bytes
}

export interface CacheInterface {
  /**
   * Get a cached value
   */
  get(key: string): Promise<CachedResult | null>;

  /**
   * Set a cached value
   */
  set(key: string, value: any, ttl?: number): Promise<void>;

  /**
   * Delete a cached value
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all cached values
   */
  clear(): Promise<void>;

  /**
   * Check if a key exists in cache
   */
  has(key: string): Promise<boolean>;
}

export type CacheStrategy =
  | "auto" // Use cache if available (default)
  | "force" // Always use cache, fail if not available
  | "bypass" // Skip cache completely
  | "refresh" // Invalidate cache and fetch fresh
  | "validate"; // Check if cache is still valid
