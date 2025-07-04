import { join } from "node:path";
import type { ConsolaInstance } from "consola";
import { countTokens } from "../index.js";
import { parseURL, validateURL } from "./url-handler.js";
import { fetchFromWeb } from "./sdk-web-fetch.js";
import { WebCache } from "./cache.js";

export async function handleWebFetch(
  args: any,
  logger: ConsolaInstance,
  config?: any
): Promise<void> {
  // Set a safety timeout for the entire operation
  const safetyTimeout = setTimeout(
    () => {
      logger.error("Operation timed out after 10 minutes");
      process.exit(1);
    },
    10 * 60 * 1000
  ); // 10 minutes

  // Validate URL
  const validation = validateURL(args.url);
  if (!validation.valid) {
    logger.error(`Invalid URL: ${validation.error}`);
    process.exit(1);
  }

  // Parse URL for output filename
  const parsedUrl = parseURL(args.url);
  if (!parsedUrl) {
    logger.error("Failed to parse URL");
    process.exit(1);
  }

  // Use provided config or args as fallback
  if (!config) {
    config = args;
  }

  // Prepare options for the SDK
  const fetchOptions = {
    format: config.format,
    verbose: config.verbose,
    tokenEncoder: config.tokenEncoder,
    maxTokens: config.maxTokens,
    extensions: config.extensions,
    excludeFiles: config.excludeFiles,
    includeFiles: config.includeFiles,
    excludeDirs: config.excludeDirs,
    includeDirs: config.includeDirs,
    projectTree: config.projectTree,
    disableLineNumbers: config.disableLineNumbers,
    tokenLimiter: config.tokenLimiter,
    templateVars: config.templateVars,
    // Web-specific options
    cacheTTL: args.cacheTTL,
    maxDepth: args.maxDepth,
    maxPages: args.maxPages,
    branch: args.branch,
    noCache: args.noCache,
    ignoreRobots: args.ignoreRobots,
    ignoreCors: args.ignoreCors,
    noApi: args.noApi,
    githubToken: args.githubToken,
  };

  // Use the SDK's fetchFromWeb function
  const output = await fetchFromWeb(args.url, fetchOptions);

  // Calculate total tokens
  const totalTokens = typeof output === "string" 
    ? await countTokens(output, config.tokenEncoder || "cl100k")
    : output.metadata.totalTokens;

  const originalCwd = process.cwd();

  // Token count is already calculated above
  if (config.tokenCountOnly) {
    console.log(totalTokens);
    return;
  }

  // Output results
  if (args.dryRun) {
    if (typeof output === "string") {
      logger.log(output);
    } else {
      // For JSON format in dry-run, output the JSON
      console.log(JSON.stringify(output, null, 2));
    }
  } else {
    if (typeof output === "string") {
      // Write markdown
      const outputFileName =
        args.outputFile ||
        `${parsedUrl.domain.replace(/\./g, "-")}-analysis.md`;
      const outputPath = join(originalCwd, outputFileName);
      await import("node:fs").then((fs) =>
        fs.promises.writeFile(outputPath, output)
      );
      logger.success(`Output written to ${outputPath}`);
    } else {
      // Write JSON
      const outputFileName =
        args.outputFile ||
        `${parsedUrl.domain.replace(/\./g, "-")}-analysis.json`;
      const outputPath = join(originalCwd, outputFileName);
      await import("node:fs").then((fs) =>
        fs.promises.writeFile(outputPath, JSON.stringify(output, null, 2))
      );
      logger.success(`Output written to ${outputPath}`);
    }
    logger.info(`Total tokens: ${totalTokens.toLocaleString()}`);
  }

  // Show cache stats
  if (config.verbose >= 2) {
    const cache = new WebCache({
      ttlHours: args.cacheTTL || 1,
    });
    await cache.init();
    const stats = await cache.getStats();
    logger.info(
      `Cache stats: ${stats.entryCount} entries, ${stats.sizeMB.toFixed(2)}MB`
    );
  }

  // Clear the safety timeout
  clearTimeout(safetyTimeout);
}