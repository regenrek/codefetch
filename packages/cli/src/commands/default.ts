import { existsSync, promises as fsp } from "node:fs";
import type { Argv } from "mri";
import { resolve, join } from "pathe";
import consola from "consola";
import ignore from "ignore";
import {
  collectFiles,
  generateMarkdown,
  DEFAULT_IGNORE_PATTERNS,
  findProjectRoot,
  countTokens,
  fetchModels,
  VALID_PROMPTS,
  collectFilesAsTree,
  FetchResultImpl,
} from "codefetch-sdk";
import { printHelp, parseArgs, loadCodefetchConfig } from "..";
import { formatModelInfo } from "../format-model-info";
import type { TokenEncoder, TokenLimiter } from "codefetch-sdk";

export default async function defaultMain(rawArgs: Argv) {
  if (rawArgs.help || rawArgs.h) {
    printHelp();
    return;
  }

  const args = parseArgs(process.argv.slice(2));
  const logger = consola.create({
    stdout: process.stdout,
    stderr: process.stderr,
  });

  // Determine source - either from URL argument or directory
  let source: string;
  let isUrl = false;

  if (args.url) {
    source = args.url;
    isUrl = true;
  } else {
    // 1: Running from root directory
    // 2: Running from components directory - npx codefetch /home/user/max/project
    // When using prompt mode with a prompt argument (e.g., -p fix "message"),
    // the message becomes rawArgs._[0], not a directory
    const isPromptMode = rawArgs.p || rawArgs.prompt;
    const promptArg = rawArgs.p || rawArgs.prompt;
    const hasPromptMessage =
      isPromptMode &&
      typeof promptArg === "string" &&
      VALID_PROMPTS.has(promptArg) &&
      rawArgs._.length > 0;

    source = resolve(
      hasPromptMessage ? "" : rawArgs._[0] /* bw compat */ || rawArgs.dir || ""
    );
  }

  // For local paths, check if we're in the project root
  if (!isUrl) {
    const projectRoot = findProjectRoot(source);
    if (
      projectRoot !== source &&
      !process.env.CI &&
      !rawArgs["skip-root-check"]
    ) {
      const shouldExit = await logger.prompt(
        `Warning: It's recommended to run codefetch from the root directory (${projectRoot}). Use --include-dirs instead.\nExit and restart from root?`,
        {
          type: "confirm",
        }
      );

      if (shouldExit) {
        process.exit(0);
      }
      logger.warn(
        "Continuing in current directory. Some files might be missed."
      );
    }
    process.chdir(source);
  }

  const config = await loadCodefetchConfig(
    isUrl ? process.cwd() : source,
    args
  );
  if (args.verbose >= 2) {
    logger.debug(`Format from args: ${args.format}`);
    logger.debug(`Format in config: ${config.format}`);
  }

  let output: string | FetchResultImpl | any;
  let totalTokens = 0;

  // Handle URLs using SDK's fetch
  if (isUrl) {
    // Set a safety timeout for web operations
    const safetyTimeout = setTimeout(
      () => {
        logger.error("Operation timed out after 10 minutes");
        process.exit(1);
      },
      10 * 60 * 1000
    ); // 10 minutes

    try {
      logger.info(`Using format: ${config.format || "markdown"}`);
      const { fetch } = await import("codefetch-sdk");

      // Prepare web-specific options
      const fetchOptions = {
        source,
        format: config.format,
        ...config,
        // Web-specific options from args
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

      output = await fetch(fetchOptions);

      // Calculate tokens if needed
      if (config.verbose >= 3 || config.maxTokens || config.tokenCountOnly) {
        if (typeof output === "string") {
          totalTokens = await countTokens(output, config.tokenEncoder);
        } else if (
          output &&
          typeof output === "object" &&
          "metadata" in output
        ) {
          totalTokens = output.metadata.totalTokens || 0;
        }
      }

      // Clear the safety timeout
      clearTimeout(safetyTimeout);
    } catch (error) {
      clearTimeout(safetyTimeout);
      throw error;
    }
  } else {
    // Handle local paths with full prompt support
    const ig = ignore().add(
      DEFAULT_IGNORE_PATTERNS.split("\n").filter(
        (line: string) => line && !line.startsWith("#")
      )
    );

    const defaultIgnorePath = join(source, ".gitignore");
    if (existsSync(defaultIgnorePath)) {
      const gitignoreContent = await fsp.readFile(defaultIgnorePath, "utf8");
      ig.add(gitignoreContent);
    }

    const codefetchIgnorePath = join(source, ".codefetchignore");
    if (existsSync(codefetchIgnorePath)) {
      const codefetchIgnoreContent = await fsp.readFile(
        codefetchIgnorePath,
        "utf8"
      );
      ig.add(codefetchIgnoreContent);
    }

    const files = await collectFiles(process.cwd(), {
      ig,
      extensionSet: config.extensions ? new Set(config.extensions) : null,
      excludeFiles: config.excludeFiles || null,
      includeFiles: config.includeFiles || null,
      excludeDirs: config.excludeDirs || null,
      includeDirs: config.includeDirs || null,
      verbose: config.verbose,
    });

    logger.info(`Using format: ${config.format || "markdown"}`);

    if (config.format === "json") {
      // Generate JSON format
      logger.info("Generating JSON format...");
      const {
        root,
        totalSize,
        totalTokens: tokens,
      } = await collectFilesAsTree(process.cwd(), files, {
        tokenEncoder: config.tokenEncoder,
        tokenLimit: config.maxTokens,
      });

      totalTokens = tokens;

      const metadata = {
        totalFiles: files.length,
        totalSize,
        totalTokens,
        fetchedAt: new Date(),
        source: process.cwd(),
      };

      output = new FetchResultImpl(root, metadata);
    } else {
      // Generate markdown format (default)
      logger.info("Generating markdown format...");
      const markdown = await generateMarkdown(files, {
        maxTokens: config.maxTokens ? Number(config.maxTokens) : null,
        verbose: Number(config.verbose || 0),
        projectTree: Number(config.projectTree || 0),
        tokenEncoder: (config.tokenEncoder as TokenEncoder) || "cl100k",
        disableLineNumbers: Boolean(config.disableLineNumbers),
        tokenLimiter: (config.tokenLimiter as TokenLimiter) || "truncated",
        promptFile: VALID_PROMPTS.has(config.defaultPromptFile)
          ? config.defaultPromptFile
          : resolve(config.outputPath, "prompts", config.defaultPromptFile),
        templateVars: config.templateVars,
      });

      output = markdown;

      // Count tokens if needed
      if (config.verbose >= 3 || config.maxTokens || config.tokenCountOnly) {
        totalTokens = await countTokens(markdown, config.tokenEncoder);

        if (config.maxTokens && totalTokens > config.maxTokens) {
          logger.warn(
            `Token limit exceeded: ${totalTokens}/${config.maxTokens}`
          );
        }
      }
    }
  }

  // If token-count-only mode, just output the count and exit
  if (config.tokenCountOnly) {
    console.log(totalTokens);
    return;
  }

  if (args.dryRun) {
    if (typeof output === "string") {
      logger.log(output);
    } else {
      // For JSON format in dry-run, output the JSON
      console.log(JSON.stringify(output, null, 2));
    }
  } else {
    if (!existsSync(config.outputPath)) {
      await fsp.mkdir(config.outputPath, { recursive: true });
      if (args.verbose > 0) {
        logger.info(`Created output directory: ${config.outputPath}`);
      }
    }

    const fullPath = join(config.outputPath, config.outputFile);

    if (typeof output === "string") {
      // Write markdown
      await fsp.writeFile(fullPath, output);
      console.log(`Output written to ${fullPath}`);
    } else {
      // Write JSON
      const jsonPath = fullPath.endsWith(".json")
        ? fullPath
        : fullPath.replace(/\.md$/, ".json");
      await fsp.writeFile(jsonPath, JSON.stringify(output, null, 2));
      console.log(`Output written to ${jsonPath}`);
    }
  }

  if (config.trackedModels?.length && !config.noSummary) {
    const { modelDb } = await fetchModels(config.trackedModels);
    const modelInfo = formatModelInfo(config.trackedModels, modelDb);

    logger.box({
      title: `Token Count Overview`,
      message: `Current Codebase: ${totalTokens.toLocaleString()} tokens\n\nModel Token Limits:\n${modelInfo}`,
      style: {
        padding: 0,
        borderColor: "cyan",
        borderStyle: "round",
      },
    });
  }

  // Show cache stats for web fetches with high verbosity
  if (isUrl && config.verbose >= 2) {
    try {
      const { createCache } = await import("codefetch-sdk");
      const cache = await createCache({
        namespace: "codefetch",
        ttl: args.cacheTTL ? args.cacheTTL * 3600 : 3600,
      });

      // Get cache stats if available
      if ("getStats" in cache && typeof cache.getStats === "function") {
        const stats = await cache.getStats();
        logger.info(
          `Cache stats: ${stats.entryCount} entries, ${stats.sizeMB.toFixed(2)}MB`
        );
      }
    } catch (error) {
      // Cache stats are optional, don't fail if unavailable
      if (config.verbose >= 3) {
        logger.debug("Could not retrieve cache stats:", error);
      }
    }
  }
}
