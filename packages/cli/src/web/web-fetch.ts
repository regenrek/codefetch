import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { execSync } from "node:child_process";
import type { ConsolaInstance } from "consola";
import {
  collectFiles,
  generateMarkdown,
  countTokens,
  DEFAULT_IGNORE_PATTERNS,
  type TokenEncoder,
  type TokenLimiter,
} from "@codefetch/sdk";
import ignore from "ignore";
import { parseURL, validateURL } from "./url-handler.js";
import { WebCache } from "./cache.js";
import { WebCrawler } from "./crawler.js";
import { generateUrlProjectStructure, crawlResultsToMarkdown } from "./url-tree.js";
import { loadCodefetchConfig } from "../config.js";
import type { WebFetchConfig } from "./types.js";

export async function handleWebFetch(
  args: any,
  logger: ConsolaInstance
): Promise<void> {
  // Set a safety timeout for the entire operation
  const safetyTimeout = setTimeout(() => {
    logger.error("Operation timed out after 10 minutes");
    process.exit(1);
  }, 10 * 60 * 1000); // 10 minutes
  const webConfig: WebFetchConfig = {
    url: args.url,
    cacheTTL: args.cacheTTL,
    maxDepth: args.maxDepth,
    maxPages: args.maxPages,
    branch: args.branch,
    noCache: args.noCache,
    ignoreRobots: args.ignoreRobots,
    ignoreCors: args.ignoreCors,
  };

  // Validate URL
  const validation = validateURL(webConfig.url);
  if (!validation.valid) {
    logger.error(`Invalid URL: ${validation.error}`);
    process.exit(1);
  }

  // Parse URL
  const parsedUrl = parseURL(webConfig.url);
  if (!parsedUrl) {
    logger.error("Failed to parse URL");
    process.exit(1);
  }

  logger.info(`Fetching from: ${parsedUrl.url}`);
  logger.info(`Type: ${parsedUrl.type}`);

  // Initialize cache
  const cache = new WebCache({
    ttlHours: webConfig.cacheTTL || 1,
  });
  await cache.init();

  // Check cache unless --no-cache is specified
  let contentPath: string | null = null;
  if (!webConfig.noCache) {
    const cached = await cache.get(parsedUrl);
    if (cached) {
      logger.info("Using cached content");
      contentPath = cached.content;
    }
  } else {
    logger.debug("Cache disabled by --no-cache flag");
  }

  // Fetch content if not cached
  if (!contentPath) {
    if (parsedUrl.type === "git-repository") {
      contentPath = await fetchGitRepository(
        parsedUrl,
        webConfig,
        logger,
        args
      );
      await cache.set(parsedUrl, contentPath);
    } else {
      // Website crawling
      contentPath = await fetchWebsite(parsedUrl, webConfig, logger, args);
      await cache.set(parsedUrl, contentPath);
    }
  }

  // Now use the existing codefetch pipeline
  logger.info("Analyzing fetched content...");

  // Load config (use defaults for web fetching)
  const config = await loadCodefetchConfig(".", args);
  
  let markdown: string;
  const originalCwd = process.cwd();
  
  if (parsedUrl.type === "website") {
    // For websites, we already have the markdown in the temp directory
    const websiteContentPath = join(contentPath, "website-content.md");
    markdown = await import("node:fs").then((fs) =>
      fs.promises.readFile(websiteContentPath, "utf8")
    );
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
      extensionSet: config.extensions ? new Set(config.extensions) : null,
      excludeFiles: config.excludeFiles || null,
      includeFiles: config.includeFiles || null,
      excludeDirs: config.excludeDirs || null,
      includeDirs: config.includeDirs || null,
      verbose: config.verbose,
    });

    // Generate markdown
    markdown = await generateMarkdown(files, {
      maxTokens: config.maxTokens ? Number(config.maxTokens) : null,
      verbose: Number(config.verbose || 0),
      projectTree: Number(config.projectTree || 0),
      tokenEncoder: (config.tokenEncoder as TokenEncoder) || "cl100k",
      disableLineNumbers: Boolean(config.disableLineNumbers),
      tokenLimiter: (config.tokenLimiter as TokenLimiter) || "truncated",
      templateVars: {
        ...config.templateVars,
        SOURCE_URL: parsedUrl.url,
        FETCHED_FROM:
          parsedUrl.type === "git-repository"
            ? `${parsedUrl.gitProvider}:${parsedUrl.gitOwner}/${parsedUrl.gitRepo}`
            : parsedUrl.domain,
      },
    });
    
    // Restore original working directory
    process.chdir(originalCwd);
  }

  // Count tokens
  const totalTokens = await countTokens(
    markdown,
    config.tokenEncoder || "cl100k"
  );

  if (config.tokenCountOnly) {
    console.log(totalTokens);
    return;
  }

  // Output results
  if (args.dryRun) {
    logger.log(markdown);
  } else {
    const outputFileName =
      args.outputFile || `${parsedUrl.domain.replace(/\./g, "-")}-analysis.md`;
    // Resolve output path based on original working directory
    const outputPath = join(originalCwd, outputFileName);
    await import("node:fs").then((fs) =>
      fs.promises.writeFile(outputPath, markdown)
    );
    logger.success(`Output written to ${outputPath}`);
    logger.info(`Total tokens: ${totalTokens.toLocaleString()}`);
  }

  // Show cache stats
  if (config.verbose >= 2) {
    const stats = await cache.getStats();
    logger.info(
      `Cache stats: ${stats.entryCount} entries, ${stats.sizeMB.toFixed(2)}MB`
    );
  }

  // Clean up temporary directory for websites
  if (parsedUrl.type === "website" && contentPath) {
    try {
      await rm(contentPath, { recursive: true, force: true });
      logger.debug("Cleaned up temporary directory");
    } catch (cleanupError) {
      logger.debug("Failed to clean up temp directory:", cleanupError);
    }
  }

  // Clear the safety timeout
  clearTimeout(safetyTimeout);

  // Website path doesn't need restoration since we didn't change directory
}

async function fetchGitRepository(
  parsedUrl: any,
  config: WebFetchConfig,
  logger: ConsolaInstance,
  args: any
): Promise<string> {
  // Create temporary directory
  const tempDir = await mkdtemp(join(tmpdir(), "codefetch-git-"));
  const repoPath = join(tempDir, "repo");

  try {
    logger.info("Cloning repository...");

    // Build clone command
    const cloneArgs = ["clone"];

    // Shallow clone by default
    if (!config.branch || config.branch === "HEAD") {
      cloneArgs.push("--depth", "1");
    }

    // Add the URL
    cloneArgs.push(parsedUrl.normalizedUrl);
    cloneArgs.push(repoPath);

    // Add branch if specified
    if (config.branch && config.branch !== "HEAD") {
      cloneArgs.push("--branch", config.branch);
      cloneArgs.push("--single-branch");
    }

    // Execute git clone
    const gitCommand = `git ${cloneArgs.join(" ")}`;
    logger.debug(`Running: ${gitCommand}`);

    execSync(gitCommand, {
      stdio: args.verbose >= 3 ? "inherit" : "pipe",
    });

    // If a specific ref was in the URL (like tree/branch), checkout to it
    if (parsedUrl.gitRef && !config.branch) {
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
      `Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function fetchWebsite(
  parsedUrl: any,
  config: WebFetchConfig,
  logger: ConsolaInstance,
  args: any
): Promise<string> {
  // Create temporary directory for the merged output
  const tempDir = await mkdtemp(join(tmpdir(), "codefetch-web-"));

  try {
    logger.info("Starting website crawl...");

    // Create crawler
    const crawler = new WebCrawler(
      parsedUrl,
      {
        maxDepth: config.maxDepth || 2,
        maxPages: config.maxPages || 50,
        ignoreRobots: config.ignoreRobots,
        ignoreCors: config.ignoreCors,
        delay: 50, // 50ms delay between requests (reduced from 100ms)
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
    
    // Return the temp directory so the rest of the pipeline can process it
    return tempDir;
  } catch (error) {
    // Clean up on error
    await rm(tempDir, { recursive: true, force: true });
    throw new Error(
      `Failed to crawl website: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
