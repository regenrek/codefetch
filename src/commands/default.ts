import { existsSync, promises as fsp } from "node:fs";
import type { Argv } from "mri";
import { resolve, join } from "pathe";
import consola from "consola";
import ignore from "ignore";
import {
  printHelp,
  collectFiles,
  generateMarkdown,
  DEFAULT_IGNORE_PATTERNS,
  findProjectRoot,
  parseArgs,
  loadCodefetchConfig,
  countTokens,
  fetchModels,
  VALID_PROMPTS,
} from "..";
import type { TokenEncoder, TokenLimiter } from "../types";

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

  // 1: Running from root directory
  // 2: Running from components directory - npx codefetch /home/user/max/project
  const cwd = resolve(rawArgs._[0] /* bw compat */ || rawArgs.dir || "");
  const projectRoot = findProjectRoot(cwd);

  if (projectRoot !== cwd) {
    const shouldExit = await logger.prompt(
      `Warning: It's recommended to run codefetch from the root directory (${projectRoot}). Use --include-dirs instead.\nExit and restart from root?`,
      {
        type: "confirm",
      }
    );

    if (shouldExit) {
      process.exit(0);
    }
    logger.warn("Continuing in current directory. Some files might be missed.");
  }

  process.chdir(cwd);

  const config = await loadCodefetchConfig(cwd, args);

  const ig = ignore().add(
    DEFAULT_IGNORE_PATTERNS.split("\n").filter(
      (line: string) => line && !line.startsWith("#")
    )
  );

  const defaultIgnorePath = join(cwd, ".gitignore");
  if (existsSync(defaultIgnorePath)) {
    const gitignoreContent = await fsp.readFile(defaultIgnorePath, "utf8");
    ig.add(gitignoreContent);
  }

  const codefetchIgnorePath = join(cwd, ".codefetchignore");
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

  // Count tokens if needed
  let totalTokens = 0;
  if (config.verbose >= 3 || config.maxTokens) {
    totalTokens = await countTokens(markdown, config.tokenEncoder);

    if (config.maxTokens && totalTokens > config.maxTokens) {
      logger.warn(`Token limit exceeded: ${totalTokens}/${config.maxTokens}`);
    }
  }

  if (args.dryRun) {
    logger.log(markdown);
  } else {
    if (!existsSync(config.outputPath)) {
      await fsp.mkdir(config.outputPath, { recursive: true });
      if (args.verbose > 0) {
        logger.info(`Created output directory: ${config.outputPath}`);
      }
    }

    const fullPath = join(config.outputPath, config.outputFile);
    await fsp.writeFile(fullPath, markdown);
    console.log(`Output written to ${fullPath}`);
  }

  if (config.trackedModels?.length) {
    const { modelInfo } = await fetchModels(config.trackedModels);

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
}
