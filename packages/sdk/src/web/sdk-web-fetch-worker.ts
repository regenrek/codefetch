/**
 * Cloudflare Worker-compatible web fetch implementation
 * Works with in-memory content instead of file system operations
 */

import { parseURL, validateURL, ParsedURL } from "./url-handler.js";
import { fetchGitHubTarball } from "./github-tarball.js";
import type { FetchOptions } from "../fetch.js";
import { FetchResultImpl } from "../fetch-result.js";
import {
  generateMarkdownFromContent,
  type FileContent,
} from "../markdown-content.js";
import type { FileNode } from "../types.js";
import { countTokens } from "../token-counter.js";
import { detectLanguage } from "../utils-browser.js";
// Import new cache system
import {
  createCache,
  CacheInterface,
  generateCacheKey,
  validateCachedContent,
} from "../cache/index.js";

/**
 * Simplified logger for Workers
 */
const createLogger = (verbose?: number) => ({
  info: (msg: string) =>
    verbose && verbose >= 1 && console.log(`[INFO] ${msg}`),
  debug: (msg: string) =>
    verbose && verbose >= 2 && console.log(`[DEBUG] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  success: (msg: string) => console.log(`[SUCCESS] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
});

/**
 * Fetch web content in a Worker-compatible way
 */
export async function fetchFromWebWorker(
  url: string,
  options: FetchOptions = {}
): Promise<string | FetchResultImpl> {
  const logger = createLogger(options.verbose);

  // Validate URL
  const validation = validateURL(url);
  if (!validation.valid) {
    throw new Error(`Invalid URL: ${validation.error}`);
  }

  // Parse URL
  const parsedUrl = parseURL(url);
  if (!parsedUrl) {
    throw new Error("Failed to parse URL");
  }

  logger.info(`Fetching from: ${parsedUrl.url}`);

  // Initialize new cache system based on options
  let cache: CacheInterface | null = null;

  if (!options.noCache && options.cache !== "bypass") {
    try {
      cache = createCache({
        namespace: options.cacheNamespace || "codefetch",
        baseUrl: options.cacheBaseUrl || "https://cache.codefetch.workers.dev",
        ttl: options.cacheTTL || 3600,
      });
    } catch (error) {
      logger.warn(`Failed to initialize cache: ${error}`);
      // Continue without cache
    }
  }

  // Generate cache key
  const cacheKey = options.cacheKey || generateCacheKey(url, options);

  // Try to get from cache first
  let files: FileContent[] = [];
  let fromCache = false;

  if (cache && options.cache !== "refresh") {
    try {
      const cached = await cache.get(cacheKey);
      if (cached && (await validateCachedContent(cached))) {
        logger.info("Using cached content");
        // For worker environment, content should be serialized
        if (typeof cached.content === "string") {
          files = JSON.parse(cached.content);
        } else if (Array.isArray(cached.content)) {
          files = cached.content;
        }
        fromCache = true;
      } else if (cached) {
        // Invalid cache entry, delete it
        await cache.delete(cacheKey);
        logger.debug("Cached content invalid, fetching fresh");
      }
    } catch (error) {
      logger.warn(`Cache retrieval failed: ${error}`);
      // Continue to fetch fresh data
    }
  }

  // Fetch content if not cached
  if (!fromCache) {
    if (parsedUrl.gitProvider === "github") {
      files = await fetchGitHubStreaming(parsedUrl, logger, options);
    } else {
      throw new Error(
        "Only GitHub repositories are supported in Cloudflare Workers. " +
          "Please use a GitHub URL (e.g., https://github.com/owner/repo)"
      );
    }

    // Store in cache if successful
    if (cache && files.length > 0 && options.cache !== "bypass") {
      try {
        await cache.set(cacheKey, JSON.stringify(files), options.cacheTTL);
      } catch (error) {
        logger.warn(`Cache storage failed: ${error}`);
        // Non-critical, continue
      }
    }
  }

  logger.info(`Analyzing ${files.length} files...`);

  // Generate output based on format
  if (options.format === "json") {
    // Build tree structure from files
    const root = await buildTreeFromFiles(files, {
      tokenEncoder: options.tokenEncoder,
      tokenLimit: options.maxTokens,
    });

    const metadata = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.content.length, 0),
      totalTokens: root.totalTokens || 0,
      fetchedAt: new Date(),
      source: parsedUrl.url,
      gitProvider: parsedUrl.gitProvider,
      gitOwner: parsedUrl.gitOwner,
      gitRepo: parsedUrl.gitRepo,
      gitRef: parsedUrl.gitRef || (options as any).branch || "main",
    };

    return new FetchResultImpl(root.node, metadata);
  } else {
    // Generate markdown
    const markdown = await generateMarkdownFromContent(files, {
      maxTokens: options.maxTokens,
      includeTreeStructure: options.projectTree !== 0,
      tokenEncoder: options.tokenEncoder || "cl100k",
      disableLineNumbers: options.disableLineNumbers,
    });

    return markdown;
  }
}

/**
 * Fetch GitHub repository content using streaming tarball
 */
async function fetchGitHubStreaming(
  parsedUrl: ParsedURL,
  logger: any,
  options: FetchOptions
): Promise<FileContent[]> {
  if (!parsedUrl.gitOwner || !parsedUrl.gitRepo) {
    throw new Error("Invalid GitHub URL - missing owner or repo");
  }

  const branch = (options as any).branch || parsedUrl.gitRef || "main";

  logger.info(
    `Streaming repository ${parsedUrl.gitOwner}/${parsedUrl.gitRepo}@${branch}...`
  );

  let _processed = 0;
  const files = await fetchGitHubTarball(
    parsedUrl.gitOwner,
    parsedUrl.gitRepo,
    branch,
    {
      token: (options as any).githubToken || (globalThis as any).GITHUB_TOKEN,
      extensions: options.extensions,
      excludeDirs: options.excludeDirs,
      maxFiles: (options as any).maxFiles || 1000,
      onProgress: (count) => {
        _processed = count;
        if (count % 50 === 0) {
          logger.info(`Processed ${count} files...`);
        }
      },
    }
  );

  logger.success(`Streamed ${files.length} files from GitHub`);
  return files;
}

/**
 * Build a tree structure from file content
 */
async function buildTreeFromFiles(
  files: FileContent[],
  options: {
    tokenEncoder?: string;
    tokenLimit?: number;
  }
): Promise<{ node: FileNode; totalTokens: number }> {
  const root: FileNode = {
    name: "",
    path: "",
    type: "directory",
    children: [],
  };

  let totalTokens = 0;

  // Sort files for consistent tree structure
  files.sort((a, b) => a.path.localeCompare(b.path));

  for (const file of files) {
    const pathParts = file.path.split("/");
    let currentNode = root;

    // Navigate/create directory structure
    for (let i = 0; i < pathParts.length - 1; i++) {
      const dirName = pathParts[i];

      if (!currentNode.children) {
        currentNode.children = [];
      }

      let dirNode = currentNode.children.find(
        (child) => child.type === "directory" && child.name === dirName
      );

      if (!dirNode) {
        dirNode = {
          name: dirName,
          path: pathParts.slice(0, i + 1).join("/"),
          type: "directory",
          children: [],
        };
        currentNode.children.push(dirNode);
      }

      currentNode = dirNode;
    }

    // Add file node
    const fileName = pathParts.at(-1) || "";
    const tokens = await countTokens(
      file.content,
      (options.tokenEncoder as any) || "simple"
    );

    const fileNode: FileNode = {
      name: fileName,
      path: file.path,
      type: "file",
      content: file.content,
      language: detectLanguage(fileName),
      size: file.content.length,
      tokens,
    };

    if (!currentNode.children) {
      currentNode.children = [];
    }

    currentNode.children.push(fileNode);
    totalTokens += tokens;
  }

  // Sort children in each directory
  sortTreeChildren(root);

  return { node: root, totalTokens };
}

function sortTreeChildren(node: FileNode) {
  if (node.children) {
    // Sort: directories first, then files, alphabetically
    node.children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    // Recursively sort children
    for (const child of node.children) {
      if (child.type === "directory") {
        sortTreeChildren(child);
      }
    }
  }
}
