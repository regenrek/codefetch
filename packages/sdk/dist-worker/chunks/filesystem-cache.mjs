import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, readFile, stat, writeFile, rm, readdir } from 'node:fs/promises';
import { c as createHash } from '../shared/codefetch-sdk.BEkAN6R-.mjs';
import 'js-tiktoken/lite';
import 'node:fs';
import 'pathe';

class FileSystemCache {
  cacheDir;
  options;
  constructor(options = {}) {
    this.options = {
      namespace: "codefetch",
      ttl: 3600,
      // 1 hour default
      maxSize: 100 * 1024 * 1024,
      // 100MB default
      ...options
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
  async ensureCacheDir() {
    await mkdir(this.cacheDir, { recursive: true });
  }
  /**
   * Get cache file path for a key
   */
  getCachePath(key) {
    const keyHash = createHash(key);
    return join(this.cacheDir, `${keyHash}.json`);
  }
  async get(key) {
    try {
      const cachePath = this.getCachePath(key);
      const content = await readFile(cachePath, "utf8");
      const cached = JSON.parse(content);
      if (cached.metadata?.expiresAt) {
        const expiresAt = new Date(cached.metadata.expiresAt);
        if (expiresAt <= /* @__PURE__ */ new Date()) {
          await this.delete(key);
          return null;
        }
      }
      if (cached.type === "filesystem" && cached.content?.path) {
        try {
          await stat(cached.content.path);
        } catch {
          await this.delete(key);
          return null;
        }
      }
      return cached;
    } catch {
      return null;
    }
  }
  async set(key, value, ttl) {
    try {
      await this.ensureCacheDir();
      const effectiveTtl = ttl || this.options.ttl || 3600;
      const now = /* @__PURE__ */ new Date();
      const expiresAt = new Date(now.getTime() + effectiveTtl * 1e3);
      const metadata = {
        url: key,
        fetchedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        contentType: "application/json"
      };
      const cachedResult = {
        metadata,
        content: value,
        type: typeof value === "string" && value.startsWith("/") ? "filesystem" : "serialized"
      };
      const cachePath = this.getCachePath(key);
      await writeFile(cachePath, JSON.stringify(cachedResult, null, 2));
      await this.cleanupIfNeeded();
    } catch (error) {
      console.warn("FileSystemCache.set failed:", error);
    }
  }
  async delete(key) {
    try {
      const cachePath = this.getCachePath(key);
      await rm(cachePath, { force: true });
    } catch {
    }
  }
  async clear() {
    try {
      await rm(this.cacheDir, { recursive: true, force: true });
    } catch {
    }
  }
  async has(key) {
    try {
      const cachePath = this.getCachePath(key);
      await stat(cachePath);
      const cached = await this.get(key);
      return cached !== null;
    } catch {
      return false;
    }
  }
  /**
   * Get total cache size in bytes
   */
  async getCacheSize() {
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
    }
    return totalSize;
  }
  /**
   * Cleanup cache if it exceeds size limit
   */
  async cleanupIfNeeded() {
    const maxSize = this.options.maxSize || 100 * 1024 * 1024;
    const currentSize = await this.getCacheSize();
    if (currentSize > maxSize) {
      try {
        const files = await readdir(this.cacheDir);
        const fileStats = [];
        for (const file of files) {
          if (file.endsWith(".json")) {
            const filePath = join(this.cacheDir, file);
            const stats = await stat(filePath);
            fileStats.push({
              path: filePath,
              atime: stats.atime,
              size: stats.size
            });
          }
        }
        fileStats.sort((a, b) => a.atime.getTime() - b.atime.getTime());
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

export { FileSystemCache };
