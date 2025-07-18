/**
 * Cloudflare Worker-compatible web fetch implementation
 * Works with in-memory content instead of file system operations
 */

import { parseURL, validateURL } from "./url-handler.js";
import { WorkerWebCache } from "./cache-worker.js";
import { isCloudflareWorker } from "../env.js";
import { GitHubApiClient } from "./github-api.js";
import type { FetchOptions } from "../fetch.js";
import { FetchResultImpl } from "../fetch-result.js";
import {
  generateMarkdownFromContent,
  type FileContent,
} from "../markdown-content.js";
import type { FileNode } from "../types.js";
import { countTokens } from "../token-counter.js";
import { detectLanguage } from "../utils-browser.js";

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

  // Initialize cache based on environment
  let cache: WorkerWebCache | null = null;
  let cachedContent: any = null;

  if ((options as any).noCache) {
    logger.debug("Cache disabled");
  } else {
    if (isCloudflareWorker) {
      cache = new WorkerWebCache({
        ttlHours: (options as any).cacheTTL || 1,
      });
      await cache.init();

      const cached = await cache.get(parsedUrl);
      if (cached) {
        logger.info("Using cached content");
        cachedContent = JSON.parse(cached.content);
      }
    }
  }

  // Fetch content if not cached
  let files: FileContent[] = [];
  if (cachedContent) {
    files = cachedContent;
  } else {
    if (parsedUrl.gitProvider === "github") {
      files = await fetchGitHubInMemory(parsedUrl, logger, options);
    } else {
      throw new Error(
        "Only GitHub repositories are supported in Cloudflare Workers. " +
          "Please use a GitHub URL (e.g., https://github.com/owner/repo)"
      );
    }

    // Cache the fetched files if cache is enabled
    if (cache) {
      await cache.set(parsedUrl, JSON.stringify(files));
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
 * Fetch GitHub repository content into memory
 */
async function fetchGitHubInMemory(
  parsedUrl: any,
  logger: any,
  options: FetchOptions
): Promise<FileContent[]> {
  if (!parsedUrl.gitOwner || !parsedUrl.gitRepo) {
    throw new Error("Invalid GitHub URL - missing owner or repo");
  }

  const client = new GitHubApiClient(
    parsedUrl.gitOwner,
    parsedUrl.gitRepo,
    logger,
    {
      token: (options as any).githubToken || (globalThis as any).GITHUB_TOKEN,
      branch: (options as any).branch || parsedUrl.gitRef,
    }
  );

  const { accessible, isPrivate, defaultBranch } = await client.checkAccess();

  if (!accessible) {
    throw new Error(
      "Repository not accessible. If it's a private repository, " +
        "please provide a GitHub token via the githubToken option."
    );
  }

  if (
    isPrivate &&
    !(options as any).githubToken &&
    !(globalThis as any).GITHUB_TOKEN
  ) {
    throw new Error(
      "Private repository requires authentication. " +
        "Please provide a GitHub token via the githubToken option."
    );
  }

  logger.info("Fetching repository via GitHub API...");

  const branch = (options as any).branch || parsedUrl.gitRef || defaultBranch;
  const zipBuffer = await client.downloadZipArchive(branch);

  logger.info("Extracting repository content...");

  // Import AdmZip dynamically for Workers compatibility
  const { default: AdmZip } = await import("adm-zip");
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  const files: FileContent[] = [];
  let rootPrefix = "";

  // Detect root prefix
  if (entries.length > 0) {
    const firstEntry = entries[0].entryName;
    const match = firstEntry.match(/^[^/]+\//);
    if (match) {
      rootPrefix = match[0];
    }
  }

  // Default exclude directories
  const defaultExcludeDirs = [
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage",
  ];
  const excludeDirs = [...(options.excludeDirs || []), ...defaultExcludeDirs];

  let extracted = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const relativePath = entry.entryName.startsWith(rootPrefix)
      ? entry.entryName.slice(rootPrefix.length)
      : entry.entryName;

    if (!relativePath) continue;

    // Check exclusions
    const pathParts = relativePath.split("/");
    const isExcluded = excludeDirs.some((dir) => pathParts.includes(dir));
    if (isExcluded) {
      skipped++;
      continue;
    }

    // Check extensions
    if (options.extensions && options.extensions.length > 0) {
      const hasValidExt = options.extensions.some((ext) =>
        relativePath.endsWith(ext)
      );
      if (!hasValidExt) {
        skipped++;
        continue;
      }
    }

    // Check file limit
    const maxFiles = (options as any).maxFiles;
    if (maxFiles && extracted >= maxFiles) {
      logger.warn(`Reached file limit (${maxFiles}), stopping extraction`);
      break;
    }

    try {
      const buffer = zip.readFile(entry);
      if (!buffer) {
        throw new Error("Failed to read file from ZIP");
      }

      files.push({
        path: relativePath,
        content: buffer.toString("utf8"),
      });

      extracted++;
      if (extracted % 50 === 0) {
        logger.info(`Extracted ${extracted} files...`);
      }
    } catch (error) {
      logger.debug(`Failed to extract ${relativePath}: ${error}`);
      skipped++;
    }
  }

  logger.success(`Extracted ${extracted} files (skipped ${skipped})`);
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
