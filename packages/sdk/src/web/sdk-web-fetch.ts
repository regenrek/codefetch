import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { execSync } from "node:child_process";
import {
  collectFiles,
  generateMarkdown,
  DEFAULT_IGNORE_PATTERNS,
  type TokenEncoder,
  type TokenLimiter,
  collectFilesAsTree,
  FetchResultImpl,
} from "../index.js";
import ignore from "ignore";
import { parseURL, validateURL, type ParsedURL } from "./url-handler.js";

import { isCloudflareWorker } from "../env.js";

import { fetchGitHubViaApi } from "./github-api.js";
import type { FetchOptions } from "../fetch.js";
// Import new cache system
import {
  createCache,
  CacheInterface,
  generateCacheKey,
  validateCachedContent,
} from "../cache/index.js";

export async function fetchFromWeb(
  url: string,
  options: FetchOptions = {}
): Promise<string | FetchResultImpl> {
  // Early redirect for Cloudflare Workers - use optimized implementation
  if (isCloudflareWorker) {
    const { fetchFromWebWorker } = await import("./sdk-web-fetch-worker.js");
    return fetchFromWebWorker(url, options);
  }

  // Create simple logger
  const logger = {
    info: (msg: string) => console.error(`[INFO] ${msg}`),
    debug: (msg: string) => {
      if (options.verbose) console.error(`[DEBUG] ${msg}`);
    },
    error: (msg: string) => console.error(`[ERROR] ${msg}`),
    success: (msg: string) => console.error(`[SUCCESS] ${msg}`),
    warn: (msg: string) => console.error(`[WARN] ${msg}`),
  };

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
  logger.info(
    `Repository: ${parsedUrl.gitProvider}:${parsedUrl.gitOwner}/${parsedUrl.gitRepo}`
  );

  // Initialize new cache system based on options
  let cache: CacheInterface | null = null;

  if (!options.noCache && options.cache !== "bypass") {
    try {
      cache = createCache({
        namespace: options.cacheNamespace || "codefetch",
        baseUrl: options.cacheBaseUrl,
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
  let contentPath: string | null = null;
  if (cache && options.cache !== "refresh") {
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        // Validate cached content still exists
        if (await validateCachedContent(cached)) {
          logger.info("Using cached content");
          contentPath = cached.content;
        } else {
          // Invalid cache entry, delete it
          await cache.delete(cacheKey);
          logger.debug("Cached content invalid, fetching fresh");
        }
      }
    } catch (error) {
      logger.warn(`Cache retrieval failed: ${error}`);
      // Continue to fetch fresh data
    }
  }

  // Fetch content if not cached
  if (!contentPath) {
    contentPath = await fetchGitRepository(parsedUrl, options, logger);

    // Store in cache if successful
    if (cache && contentPath && options.cache !== "bypass") {
      try {
        await cache.set(cacheKey, contentPath, options.cacheTTL);
      } catch (error) {
        logger.warn(`Cache storage failed: ${error}`);
        // Non-critical, continue
      }
    }
  }

  // Now use the existing codefetch pipeline
  logger.info("Analyzing fetched content...");

  let output: string | FetchResultImpl;
  let totalTokens = 0;
  const originalCwd = isCloudflareWorker ? "." : process.cwd();

  // For git repositories, use the existing pipeline
  // Change to the fetched content directory for proper relative path handling
  if (!isCloudflareWorker) {
    process.chdir(contentPath);
  }

  // Set up ignore patterns
  const ig = ignore().add(
    DEFAULT_IGNORE_PATTERNS.split("\n").filter(
      (line: string) => line && !line.startsWith("#")
    )
  );

  // Collect files from the fetched content
  if (isCloudflareWorker) {
    throw new Error(
      "This code path should not be reached in Cloudflare Workers. " +
        "The Worker-safe implementation should have been used."
    );
  }

  const files = await collectFiles(".", {
    ig,
    extensionSet: options.extensions ? new Set(options.extensions) : null,
    excludeFiles: options.excludeFiles || null,
    includeFiles: options.includeFiles || null,
    excludeDirs: options.excludeDirs || null,
    includeDirs: options.includeDirs || null,
    verbose: options.verbose || 0,
  });

  if (options.format === "json") {
    // Generate JSON format
    const {
      root,
      totalSize,
      totalTokens: tokens,
    } = await collectFilesAsTree(".", files, {
      tokenEncoder: options.tokenEncoder,
      tokenLimit: options.maxTokens,
    });

    totalTokens = tokens;

    const metadata = {
      totalFiles: files.length,
      totalSize,
      totalTokens,
      fetchedAt: new Date(),
      source: parsedUrl.url,
      gitProvider: parsedUrl.gitProvider,
      gitOwner: parsedUrl.gitOwner,
      gitRepo: parsedUrl.gitRepo,
      gitRef: parsedUrl.gitRef || (options as any).branch || "main",
    };

    output = new FetchResultImpl(root, metadata);
  } else {
    // Generate markdown
    const markdown = await generateMarkdown(files, {
      maxTokens: options.maxTokens ? Number(options.maxTokens) : null,
      verbose: Number(options.verbose || 0),
      projectTree: Number(options.projectTree || 0),
      tokenEncoder: (options.tokenEncoder as TokenEncoder) || "cl100k",
      disableLineNumbers: Boolean(options.disableLineNumbers),
      tokenLimiter: (options.tokenLimiter as TokenLimiter) || "truncated",
      templateVars: {
        ...options.templateVars,
        SOURCE_URL: parsedUrl.url,
        FETCHED_FROM: `${parsedUrl.gitProvider}:${parsedUrl.gitOwner}/${parsedUrl.gitRepo}`,
      },
    });

    output = markdown;
  }

  // Restore original working directory
  if (!isCloudflareWorker) {
    process.chdir(originalCwd);
  }

  return output;
}

async function fetchGitRepository(
  parsedUrl: ParsedURL,
  options: FetchOptions,
  logger: any
): Promise<string> {
  // Create temporary directory
  const tempDir = await mkdtemp(join(tmpdir(), "codefetch-git-"));
  const repoPath = join(tempDir, "repo");

  try {
    // Try GitHub API first if it's a GitHub URL
    if (parsedUrl.gitProvider === "github" && !(options as any).noApi) {
      logger.info("Attempting to fetch via GitHub API...");

      const apiSuccess = await fetchGitHubViaApi(parsedUrl, repoPath, logger, {
        branch: (options as any).branch || parsedUrl.gitRef,
        token: (options as any).githubToken || process.env.GITHUB_TOKEN,
        extensions: options.extensions,
        excludeDirs: options.excludeDirs,
        maxFiles: 1000,
      });

      if (apiSuccess) {
        logger.success("Repository fetched successfully via API");
        return repoPath;
      }

      logger.info("Falling back to git clone...");
    }

    // Fall back to git clone
    if (isCloudflareWorker) {
      throw new Error(
        "git clone is not supported in Cloudflare Workers. " +
          "Use a public GitHub repo or provide GITHUB_TOKEN for ZIP mode."
      );
    }

    logger.info("Cloning repository...");

    // Build clone command
    const cloneArgs = ["clone"];

    // Shallow clone by default
    if (!(options as any).branch || (options as any).branch === "HEAD") {
      cloneArgs.push("--depth", "1");
    }

    // Add the URL
    cloneArgs.push(parsedUrl.normalizedUrl);
    cloneArgs.push(repoPath);

    // Add branch if specified
    if ((options as any).branch && (options as any).branch !== "HEAD") {
      cloneArgs.push("--branch", (options as any).branch);
      cloneArgs.push("--single-branch");
    }

    // Execute git clone
    const gitCommand = `git ${cloneArgs.join(" ")}`;
    logger.debug(`Running: ${gitCommand}`);

    execSync(gitCommand, {
      stdio: options.verbose && options.verbose >= 3 ? "inherit" : "pipe",
    });

    // If a specific ref was in the URL (like tree/branch), checkout to it
    if (parsedUrl.gitRef && !(options as any).branch) {
      logger.info(`Checking out ref: ${parsedUrl.gitRef}`);
      execSync(`git checkout ${parsedUrl.gitRef}`, {
        cwd: repoPath,
        stdio: "pipe",
      });
    }

    logger.success("Repository cloned successfully");
    return repoPath;
  } catch (error) {
    // Clean up on error
    await rm(tempDir, { recursive: true, force: true });
    throw new Error(
      `Failed to fetch repository: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
