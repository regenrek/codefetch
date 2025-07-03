import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import {
  collectFiles,
  generateMarkdown,
  countTokens,
  DEFAULT_IGNORE_PATTERNS,
  type TokenEncoder,
  type TokenLimiter,
  collectFilesAsTree,
  FetchResultImpl,
} from "../index.js";
import ignore from "ignore";
import { parseURL, validateURL } from "./url-handler.js";
import { WebCache } from "./cache.js";
import { WebCrawler } from "./crawler.js";
import {
  generateUrlProjectStructure,
  crawlResultsToMarkdown,
} from "./url-tree.js";
import { fetchGitHubViaApi } from "./github-api.js";
import type { WebFetchConfig } from "./types.js";
import type { FetchOptions } from "../fetch.js";

export async function fetchFromWeb(
  url: string,
  options: FetchOptions = {}
): Promise<string | FetchResultImpl> {
  const logger = {
    info: (msg: string) =>
      options.verbose && options.verbose >= 1 && console.error(`[INFO] ${msg}`),
    debug: (msg: string) =>
      options.verbose &&
      options.verbose >= 2 &&
      console.error(`[DEBUG] ${msg}`),
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
  logger.info(`Type: ${parsedUrl.type}`);

  // Initialize cache
  const cache = new WebCache({
    ttlHours: (options as any).cacheTTL || 1,
  });
  await cache.init();

  // Check cache unless --no-cache is specified
  let contentPath: string | null = null;
  if ((options as any).noCache) {
    logger.debug("Cache disabled");
  } else {
    const cached = await cache.get(parsedUrl);
    if (cached) {
      logger.info("Using cached content");
      contentPath = cached.content;
    }
  }

  // Variables to store crawl results for websites
  let crawlResults: any[] | null = null;

  // Fetch content if not cached
  if (!contentPath) {
    if (parsedUrl.type === "git-repository") {
      contentPath = await fetchGitRepository(parsedUrl, options, logger);
      await cache.set(parsedUrl, contentPath);
    } else {
      // Website crawling
      const result = await fetchWebsite(parsedUrl, options, logger);
      contentPath = result.tempDir;
      crawlResults = result.crawlResults;
      await cache.set(parsedUrl, contentPath);
    }
  }

  // Now use the existing codefetch pipeline
  logger.info("Analyzing fetched content...");

  let output: string | FetchResultImpl;
  let totalTokens = 0;
  const originalCwd = process.cwd();

  if (parsedUrl.type === "website") {
    // For websites, we already have the markdown in the temp directory
    const websiteContentPath = join(contentPath, "website-content.md");
    const markdown = await readFile(websiteContentPath, "utf8");

    if (options.format === "json") {
      // If we have crawl results and want JSON, create individual files
      if (crawlResults && crawlResults.length > 0) {
        // Build a tree structure from URLs
        const root: any = {
          name: parsedUrl.domain,
          path: "",
          type: "directory",
          children: [],
        };

        // Create a map to track directories
        const dirMap = new Map<string, any>();
        dirMap.set("", root);

        let totalSize = 0;
        totalTokens = 0;

        // Process each crawled page
        for (const page of crawlResults) {
          if (page.error) continue;

          // Parse URL to get path
          const url = new URL(page.url);
          let pathname = url.pathname;

          // Remove trailing slash
          if (pathname.endsWith("/") && pathname !== "/") {
            pathname = pathname.slice(0, -1);
          }

          // Handle root path - already correct, just ensure it stays as "/"
          if (pathname === "/" || pathname === "") {
            pathname = "/";
          }

          // Ensure path starts with /
          if (!pathname.startsWith("/")) {
            pathname = "/" + pathname;
          }

          // Split path into parts
          const pathParts = pathname.slice(1).split("/").filter(Boolean);

          // Create directories as needed
          let currentDir = root;
          let currentPath = "";

          // Build directory structure (all parts except the last one)
          for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;

            if (dirMap.has(currentPath)) {
              currentDir = dirMap.get(currentPath);
            } else {
              const newDir = {
                name: part,
                path: currentPath,
                type: "directory",
                children: [],
              };
              currentDir.children.push(newDir);
              dirMap.set(currentPath, newDir);
              currentDir = newDir;
            }
          }

          // The last part is the page name, or the root path name
          const pageName = pathname === "/" ? "/" : (pathParts.length > 0 ? pathParts.at(-1) : "index");
          const fullPath = pathname;

          // Create markdown content with title and content
          const pageContent = `# ${page.title}\n\n${page.content}`;
          const size = Buffer.byteLength(pageContent, "utf8");
          const tokens = await countTokens(
            pageContent,
            options.tokenEncoder || "cl100k"
          );

          totalSize += size;
          totalTokens += tokens;

          currentDir.children.push({
            name: pageName,
            path: fullPath,
            type: "file",
            content: pageContent,
            language: "markdown",
            size,
            tokens,
            url: page.url,
          });
        }

        const metadata = {
          totalFiles: crawlResults.filter((r) => !r.error).length,
          totalSize,
          totalTokens,
          fetchedAt: new Date(),
          source: parsedUrl.url,
        };

        output = new FetchResultImpl(root, metadata);
      } else {
        // Fallback to single file if no crawl results
        const root: any = {
          name: parsedUrl.domain,
          path: "",
          type: "directory",
          children: [
            {
              name: "website-content.md",
              path: "website-content.md",
              type: "file",
              content: markdown,
              language: "markdown",
              size: Buffer.byteLength(markdown, "utf8"),
              tokens: await countTokens(
                markdown,
                options.tokenEncoder || "cl100k"
              ),
            },
          ],
        };

        totalTokens = root.children[0].tokens;

        const metadata = {
          totalFiles: 1,
          totalSize: root.children[0].size,
          totalTokens,
          fetchedAt: new Date(),
          source: parsedUrl.url,
        };

        output = new FetchResultImpl(root, metadata);
      }
    } else {
      output = markdown;
    }
  } else {
    // For git repositories, use the existing pipeline
    // Change to the fetched content directory for proper relative path handling
    process.chdir(contentPath);

    // Set up ignore patterns
    const ig = ignore().add(
      DEFAULT_IGNORE_PATTERNS.split("\n").filter(
        (line: string) => line && !line.startsWith("#")
      )
    );

    // Collect files from the fetched content
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
          FETCHED_FROM:
            parsedUrl.type === "git-repository"
              ? `${parsedUrl.gitProvider}:${parsedUrl.gitOwner}/${parsedUrl.gitRepo}`
              : parsedUrl.domain,
        },
      });

      output = markdown;
    }

    // Restore original working directory
    process.chdir(originalCwd);
  }

  // Clean up temporary directory for websites
  if (parsedUrl.type === "website" && contentPath) {
    try {
      await rm(contentPath, { recursive: true, force: true });
      logger.debug("Cleaned up temporary directory");
    } catch (cleanupError) {
      logger.debug(`Failed to clean up temp directory: ${cleanupError}`);
    }
  }

  return output;
}

async function fetchGitRepository(
  parsedUrl: any,
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

async function fetchWebsite(
  parsedUrl: any,
  options: FetchOptions,
  logger: any
): Promise<{ tempDir: string; crawlResults: any[] }> {
  // Create temporary directory for the merged output
  const tempDir = await mkdtemp(join(tmpdir(), "codefetch-web-"));

  try {
    logger.info("Starting website crawl...");

    // Create crawler
    const crawler = new WebCrawler(
      parsedUrl,
      {
        maxDepth: (options as any).maxDepth || 2,
        maxPages: (options as any).maxPages || 50,
        ignoreRobots: (options as any).ignoreRobots,
        ignoreCors: (options as any).ignoreCors,
        delay: 50, // 50ms delay between requests
      },
      logger
    );

    // Crawl website and get results
    const crawlResults = await crawler.crawl();

    logger.success("Website crawled successfully");

    // Generate project structure
    const projectStructure = generateUrlProjectStructure(crawlResults);

    // Generate content sections
    const contentSections = crawlResultsToMarkdown(crawlResults);

    // Combine into single markdown file
    const fullMarkdown = projectStructure + contentSections;

    // Save to a file in temp directory
    const outputPath = join(tempDir, "website-content.md");
    await import("node:fs").then((fs) =>
      fs.promises.writeFile(outputPath, fullMarkdown)
    );

    // Return the temp directory and crawl results
    return { tempDir, crawlResults };
  } catch (error) {
    // Clean up on error
    await rm(tempDir, { recursive: true, force: true });
    throw new Error(
      `Failed to crawl website: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
