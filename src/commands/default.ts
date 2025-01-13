import { existsSync, promises as fsp } from "node:fs";
import type { Argv } from "mri";
import { resolve, join, dirname } from "pathe";
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
  resolveCodefetchConfig,
  loadModelDb,
} from "..";
import type { TokenEncoder } from "../types";

export default async function defaultMain(rawArgs: Argv) {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  // 1: Running from root directory
  // 2: Running from components directory - npx codefetch /home/user/max/project
  const cwd = resolve(rawArgs._[0] /* bw compat */ || rawArgs.dir || "");

  const projectRoot = findProjectRoot(cwd);
  if (projectRoot !== cwd) {
    const shouldExit = await consola.prompt(
      `Warning: It's recommended to run codefetch from the root directory (${projectRoot}).\nExit and restart from root?`,
      {
        type: "confirm",
      }
    );

    if (shouldExit) {
      process.exit(0);
    }
    consola.warn(
      "Continuing in current directory. Some files might be missed."
    );
  }

  process.chdir(cwd);
  consola.wrapConsole();

  const config = await loadCodefetchConfig(cwd, {
    outputPath: args.outputPath,
    outputFile: args.output,
    maxTokens: args.maxTokens,
    verbose: args.verbose,
    projectTree: args.projectTree,
    extensions: args.extensions,
    includeFiles: args.includeFiles,
    excludeFiles: args.excludeFiles,
    includeDirs: args.includeDirs,
    excludeDirs: args.excludeDirs,
    defaultIgnore: true,
    gitignore: true,
    tokenEncoder: args.tokenEncoder as TokenEncoder,
  });

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
    maxTokens: config.maxTokens,
    verbose: config.verbose,
    projectTree: config.projectTree,
    tokenEncoder: config.tokenEncoder,
  });

  // Count tokens if needed
  let totalTokens = 0;
  if (config.verbose >= 3 || config.maxTokens) {
    totalTokens = await countTokens(markdown, config.tokenEncoder);

    if (config.maxTokens && totalTokens > config.maxTokens) {
      consola.warn(`Token limit exceeded: ${totalTokens}/${config.maxTokens}`);
    }
  }

  if (config.trackedModels?.length) {
    const modelDb = await loadModelDb();
    const modelInfo = config.trackedModels
      .map((modelName) => {
        const model = modelDb[modelName] || {};
        return model.max_input_tokens
          ? `${modelName}: ${model.max_input_tokens.toLocaleString()} tokens`
          : `${modelName}: Unknown`;
      })
      .join("\n");

    consola.box({
      title: `Your token count: ${totalTokens.toLocaleString()}`,
      message: `Max input tokens for LLMs:\n${modelInfo}`,
      style: {
        padding: 1,
        borderColor: "cyan",
        borderStyle: "round",
      },
    });
  }

  if (args.dryRun) {
    consola.log(markdown);
  } else {
    if (!existsSync(config.outputPath)) {
      await fsp.mkdir(config.outputPath, { recursive: true });
      if (args.verbose > 0) {
        consola.info(`Created output directory: ${config.outputPath}`);
      }
    }

    const fullPath = join(config.outputPath, config.outputFile);
    await fsp.writeFile(fullPath, markdown);
    consola.success(`Output written to ${fullPath}`);
  }

  if (totalTokens > 0) {
    consola.info(`Total tokens: ${totalTokens}`);
  }
}
