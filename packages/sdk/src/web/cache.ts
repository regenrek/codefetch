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
import { createHash } from "node:crypto";
import { extractCacheKey, ParsedURL } from "./url-handler.js";

export interface CacheMetadata {
  url: string;
  fetchedAt: string;
  expiresAt: string;
  contentType?: string;
  headers?: Record<string, string>;
}

export interface CacheEntry {
  metadata: CacheMetadata;
  content: string;
}

export class WebCache {
  private cacheDir: string;
  private ttlHours: number;
  private maxSizeMB: number;

  constructor(options?: {
    cacheDir?: string;
    ttlHours?: number;
    maxSizeMB?: number;
  }) {
    this.cacheDir = options?.cacheDir || join(tmpdir(), ".codefetch-cache");
    this.ttlHours = options?.ttlHours ?? 1;
    this.maxSizeMB = options?.maxSizeMB ?? 500;
  }

  /**
   * Initialize cache directory
   */
  async init(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
    await mkdir(join(this.cacheDir, "websites"), { recursive: true });
    await mkdir(join(this.cacheDir, "repos"), { recursive: true });

    // Check cache size and cleanup if needed
    await this.cleanupIfNeeded();
  }

  /**
   * Get cache directory for a parsed URL
   */
  private getCacheDir(parsedUrl: ParsedURL): string {
    const type = parsedUrl.type === "git-repository" ? "repos" : "websites";
    const key = extractCacheKey(parsedUrl);
    const hash = createHash("md5").update(key).digest("hex").slice(0, 8);
    return join(this.cacheDir, type, `${key}-${hash}`);
  }

  /**
   * Check if cache entry exists and is valid
   */
  async has(parsedUrl: ParsedURL): Promise<boolean> {
    try {
      const dir = this.getCacheDir(parsedUrl);
      const metadataPath = join(dir, "metadata.json");

      const metadataContent = await readFile(metadataPath, "utf8");
      const metadata: CacheMetadata = JSON.parse(metadataContent);

      // Check if expired
      const expiresAt = new Date(metadata.expiresAt);
      return expiresAt > new Date();
    } catch {
      // File doesn't exist or is invalid
      return false;
    }
  }

  /**
   * Get cached content
   */
  async get(parsedUrl: ParsedURL): Promise<CacheEntry | null> {
    try {
      const dir = this.getCacheDir(parsedUrl);
      const metadataPath = join(dir, "metadata.json");

      const metadataContent = await readFile(metadataPath, "utf8");
      const metadata: CacheMetadata = JSON.parse(metadataContent);

      // Check if expired
      const expiresAt = new Date(metadata.expiresAt);
      if (expiresAt <= new Date()) {
        await this.delete(parsedUrl);
        return null;
      }

      // For git repos, content is the path to the cloned directory
      if (parsedUrl.type === "git-repository") {
        const content = await readFile(join(dir, "repo-path.txt"), "utf8");
        
        // Validate that the repository directory still exists
        try {
          await stat(content);
        } catch {
          // Repository directory doesn't exist, clear this cache entry
          await this.delete(parsedUrl);
          return null;
        }
        
        return { metadata, content };
      }

      // For websites, return the content directory path
      const contentPath = join(dir, "content");
      
      // Validate that the content directory still exists
      try {
        await stat(contentPath);
      } catch {
        // Content directory doesn't exist, clear this cache entry
        await this.delete(parsedUrl);
        return null;
      }
      
      return {
        metadata,
        content: contentPath,
      };
    } catch {
      // Cache entry doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Store content in cache
   */
  async set(
    parsedUrl: ParsedURL,
    content: string | Buffer,
    options?: {
      contentType?: string;
      headers?: Record<string, string>;
    }
  ): Promise<void> {
    const dir = this.getCacheDir(parsedUrl);
    await mkdir(dir, { recursive: true });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlHours * 60 * 60 * 1000);

    const metadata: CacheMetadata = {
      url: parsedUrl.url,
      fetchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      contentType: options?.contentType,
      headers: options?.headers,
    };

    // Save metadata
    await writeFile(
      join(dir, "metadata.json"),
      JSON.stringify(metadata, null, 2)
    );

    // Save content
    if (parsedUrl.type === "git-repository") {
      // For git repos, content is the path to the cloned directory
      await writeFile(join(dir, "repo-path.txt"), content.toString());
    } else {
      // For websites, create content directory
      const contentDir = join(dir, "content");
      await mkdir(contentDir, { recursive: true });
      // Content handling will be done by the crawler
    }
  }

  /**
   * Delete cache entry
   */
  async delete(parsedUrl: ParsedURL): Promise<void> {
    const dir = this.getCacheDir(parsedUrl);
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    try {
      await rm(this.cacheDir, { recursive: true, force: true });
      await this.init();
    } catch {
      // Ignore errors
    }
  }

  /**
   * Get cache size in MB
   */
  private async getCacheSize(): Promise<number> {
    let totalSize = 0;

    async function getDirectorySize(dir: string): Promise<number> {
      let size = 0;
      try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            size += await getDirectorySize(fullPath);
          } else {
            const stats = await stat(fullPath);
            size += stats.size;
          }
        }
      } catch {
        // Ignore errors
      }
      return size;
    }

    totalSize = await getDirectorySize(this.cacheDir);
    return totalSize / (1024 * 1024); // Convert to MB
  }

  /**
   * Cleanup cache if it exceeds size limit
   */
  private async cleanupIfNeeded(): Promise<void> {
    const sizeMB = await this.getCacheSize();

    if (sizeMB > this.maxSizeMB) {
      // Get all cache entries with their metadata
      const entries: { dir: string; metadata: CacheMetadata; stats: any }[] =
        [];

      for (const type of ["websites", "repos"]) {
        const typeDir = join(this.cacheDir, type);
        try {
          const dirs = await readdir(typeDir);

          for (const dir of dirs) {
            const fullDir = join(typeDir, dir);
            const metadataPath = join(fullDir, "metadata.json");

            try {
              const metadataContent = await readFile(metadataPath, "utf8");
              const metadata: CacheMetadata = JSON.parse(metadataContent);
              const stats = await stat(fullDir);
              entries.push({ dir: fullDir, metadata, stats });
            } catch {
              // Remove invalid entries
              await rm(fullDir, { recursive: true, force: true }).catch(() => {
                /* ignore */
              });
            }
          }
        } catch {
          // Directory might not exist
        }
      }

      // Sort by last accessed time (oldest first)
      entries.sort((a, b) => a.stats.atime.getTime() - b.stats.atime.getTime());

      // Remove oldest entries until we're under the limit
      let currentSizeMB = sizeMB;
      for (const entry of entries) {
        if (currentSizeMB <= this.maxSizeMB * 0.8) break; // Keep 20% buffer

        // Get size before removing
        const entrySize = await getDirectorySize(entry.dir);
        await rm(entry.dir, { recursive: true, force: true });
        currentSizeMB -= entrySize / (1024 * 1024);
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    sizeMB: number;
    entryCount: number;
    websiteCount: number;
    repoCount: number;
  }> {
    const sizeMB = await this.getCacheSize();
    let websiteCount = 0;
    let repoCount = 0;

    try {
      websiteCount = (await readdir(join(this.cacheDir, "websites"))).length;
    } catch {
      // Directory doesn't exist
    }

    try {
      repoCount = (await readdir(join(this.cacheDir, "repos"))).length;
    } catch {
      // Directory doesn't exist
    }

    return {
      sizeMB,
      entryCount: websiteCount + repoCount,
      websiteCount,
      repoCount,
    };
  }
}

// Helper function for directory size calculation
async function getDirectorySize(dir: string): Promise<number> {
  let size = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        size += await getDirectorySize(fullPath);
      } else {
        const stats = await stat(fullPath);
        size += stats.size;
      }
    }
  } catch {
    // Directory traversal error
  }
  return size;
}