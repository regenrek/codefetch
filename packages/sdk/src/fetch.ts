import { resolve } from "pathe";
import ignore from "ignore";
import { readFile } from "node:fs/promises";
import type { FetchResult, OutputFormat } from "./types";
import type { CodefetchConfig } from "./config";
import { collectFiles } from "./files";
import { collectFilesAsTree } from "./files-tree";
import { generateMarkdown } from "./markdown";
import { FetchResultImpl } from "./fetch-result";
import { DEFAULT_IGNORE_PATTERNS } from "./default-ignore";
import { CacheStrategy } from "./cache/interface.js";

export interface FetchOptions extends Partial<CodefetchConfig> {
  source?: string; // URL or local path, defaults to cwd
  format?: OutputFormat;

  // Cache control options
  cache?: boolean | CacheStrategy;
  cacheKey?: string;
  cacheTTL?: number; // in seconds
  cacheNamespace?: string;

  // For Cloudflare Workers
  cacheBaseUrl?: string;

  // Bypass cache completely
  noCache?: boolean;
}

export async function fetch(
  options: FetchOptions = {}
): Promise<FetchResult | string> {
  // Check if source is a URL
  const source = options.source || process.cwd();

  // URL detection - check for http(s):// or known git providers
  const isUrl =
    /^https?:\/\//.test(source) ||
    /^(github\.com|gitlab\.com|bitbucket\.org)/.test(source);

  if (isUrl) {
    // Import web functionality
    const { fetchFromWeb } = await import("./web/sdk-web-fetch");

    // Ensure proper URL format
    let normalizedUrl = source;
    if (
      !normalizedUrl.startsWith("http://") &&
      !normalizedUrl.startsWith("https://")
    ) {
      // Default to https for URLs without protocol
      normalizedUrl = "https://" + normalizedUrl;
    }

    // Use the SDK-friendly web fetch function
    return await fetchFromWeb(normalizedUrl, options);
  }

  const cwd = resolve(source);
  const format = options.format || "markdown";

  // Set up ignore instance
  const ig = ignore();

  // Add default ignore patterns if enabled
  if (options.defaultIgnore !== false) {
    ig.add(DEFAULT_IGNORE_PATTERNS);
  }

  // Add gitignore patterns if enabled and file exists
  if (options.gitignore !== false) {
    try {
      const gitignoreContent = await readFile(
        resolve(cwd, ".gitignore"),
        "utf8"
      );
      ig.add(gitignoreContent);
    } catch {
      // No gitignore file, continue
    }
  }

  // Add custom excludes
  if (options.excludeFiles) {
    ig.add(options.excludeFiles);
  }

  // Prepare extension set
  const extensionSet = options.extensions
    ? new Set(
        options.extensions.map((ext: string) =>
          ext.startsWith(".") ? ext : `.${ext}`
        )
      )
    : null;

  // Collect files
  const files = await collectFiles(cwd, {
    ig,
    extensionSet,
    excludeFiles: options.excludeFiles || null,
    includeFiles: options.includeFiles || null,
    excludeDirs: options.excludeDirs || null,
    includeDirs: options.includeDirs || null,
    verbose: options.verbose || 0,
  });

  if (format === "json") {
    // Build tree structure
    const { root, totalSize, totalTokens } = await collectFilesAsTree(
      cwd,
      files,
      {
        tokenEncoder: options.tokenEncoder,
        tokenLimit: options.maxTokens,
      }
    );

    const metadata = {
      totalFiles: files.length,
      totalSize,
      totalTokens,
      fetchedAt: new Date(),
      source: cwd,
    };

    return new FetchResultImpl(root, metadata);
  } else {
    // Generate markdown format
    return generateMarkdown(files, {
      maxTokens: options.maxTokens || null,
      verbose: options.verbose || 0,
      projectTree: options.projectTree === undefined ? 3 : options.projectTree,
      tokenEncoder: options.tokenEncoder || "simple",
      disableLineNumbers: options.disableLineNumbers || false,
      tokenLimiter: options.tokenLimiter || "truncated",
      projectTreeBaseDir: cwd,
      projectTreeSkipIgnoreFiles: Boolean(options.projectTreeSkipIgnoreFiles),
    });
  }
}
