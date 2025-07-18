/**
 * File system cache implementation for Node.js environments
 */

import {
  CacheInterface,
  CachedResult,
  CacheOptions,
  CacheMetadata,
} from "./interface.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  mkdir,
  readFile,
  writeFile,
  rm,
  stat,
  readdir,
} from "node:fs/promises";
import { createHash } from "../utils.js";

export class FileSystemCache implements CacheInterface {
  private cacheDir: string;
  private options: CacheOptions;

  constructor(options: CacheOptions = {}) {
    this.options = {
      namespace: "codefetch",
      ttl: 3600, // 1 hour default
      maxSize: 100 * 1024 * 1024, // 100MB default
      ...options,
    };

    this.cacheDir = join(
      tmpdir(),
      `.codefetch-cache`,
      this.options.namespace || "codefetch"
    );
  }

  /**
   * Initialize cache directory
   */
  private async ensureCacheDir(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
  }

  /**
   * Get cache file path for a key
   */
  private getCachePath(key: string): string {
    const keyHash = createHash(key);
    return join(this.cacheDir, `${keyHash}.json`);
  }

  async get(key: string): Promise<CachedResult | null> {
    try {
      const cachePath = this.getCachePath(key);
      const content = await readFile(cachePath, "utf8");
      const cached = JSON.parse(content) as CachedResult;

      // Check if expired
      if (cached.metadata?.expiresAt) {
        const expiresAt = new Date(cached.metadata.expiresAt);
        if (expiresAt <= new Date()) {
          await this.delete(key);
          return null;
        }
      }

      // For filesystem type, validate the path still exists
      if (cached.type === "filesystem" && cached.content?.path) {
        try {
          await stat(cached.content.path);
        } catch {
          // Path no longer exists
          await this.delete(key);
          return null;
        }
      }

      return cached;
    } catch {
      // File doesn't exist or is invalid
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.ensureCacheDir();

      const effectiveTtl = ttl || this.options.ttl || 3600;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + effectiveTtl * 1000);

      const metadata: CacheMetadata = {
        url: key,
        fetchedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        contentType: "application/json",
      };

      const cachedResult: CachedResult = {
        metadata,
        content: value,
        type:
          typeof value === "string" && value.startsWith("/")
            ? "filesystem"
            : "serialized",
      };

      const cachePath = this.getCachePath(key);
      await writeFile(cachePath, JSON.stringify(cachedResult, null, 2));

      // Check cache size and cleanup if needed
      await this.cleanupIfNeeded();
    } catch (error) {
      console.warn("FileSystemCache.set failed:", error);
      // Fail silently - caching is not critical
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const cachePath = this.getCachePath(key);
      await rm(cachePath, { force: true });
    } catch {
      // Ignore errors
    }
  }

  async clear(): Promise<void> {
    try {
      await rm(this.cacheDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const cachePath = this.getCachePath(key);
      await stat(cachePath);

      // Check if still valid
      const cached = await this.get(key);
      return cached !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get total cache size in bytes
   */
  private async getCacheSize(): Promise<number> {
    let totalSize = 0;

    try {
      const files = await readdir(this.cacheDir);

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = join(this.cacheDir, file);
          const stats = await stat(filePath);
          totalSize += stats.size;
        }
      }
    } catch {
      // Directory might not exist
    }

    return totalSize;
  }

  /**
   * Cleanup cache if it exceeds size limit
   */
  private async cleanupIfNeeded(): Promise<void> {
    const maxSize = this.options.maxSize || 100 * 1024 * 1024; // 100MB default
    const currentSize = await this.getCacheSize();

    if (currentSize > maxSize) {
      try {
        const files = await readdir(this.cacheDir);
        const fileStats: { path: string; atime: Date; size: number }[] = [];

        // Get stats for all cache files
        for (const file of files) {
          if (file.endsWith(".json")) {
            const filePath = join(this.cacheDir, file);
            const stats = await stat(filePath);
            fileStats.push({
              path: filePath,
              atime: stats.atime,
              size: stats.size,
            });
          }
        }

        // Sort by access time (oldest first)
        fileStats.sort((a, b) => a.atime.getTime() - b.atime.getTime());

        // Remove oldest files until we're under 80% of the limit
        let removedSize = 0;
        const targetSize = maxSize * 0.8;

        for (const file of fileStats) {
          if (currentSize - removedSize <= targetSize) {
            break;
          }

          await rm(file.path, { force: true });
          removedSize += file.size;
        }
      } catch (error) {
        console.warn("Cache cleanup failed:", error);
      }
    }
  }
}
