import { existsSync, promises as fsp } from "node:fs";
import mri from "mri";
import { resolve, join } from "pathe";
import { spinner } from "@clack/prompts";
import ignore from "ignore";
import {
  collectFiles,
  generateMarkdown,
  DEFAULT_IGNORE_PATTERNS,
  findProjectRoot,
  countTokens,
  VALID_PROMPTS,
  type CodefetchConfig,
} from "codefetch-sdk";
import { loadCodefetchConfig, parseArgs } from "..";
import { copyToClipboard } from "../utils/clipboard";
import { openBrowser, buildChatUrl } from "../utils/browser";
import type { TokenEncoder, TokenLimiter } from "codefetch-sdk";

// Default values for open command
const DEFAULTS = {
  url: "chatgpt.com",
  model: "gpt-4.1-pro",
  prompt:
    "Your codebase is in the clipboard - remove this text and paste it here",
};

// Helper to determine prompt file path
function getPromptFile(
  config: CodefetchConfig & { inlinePrompt?: string }
): string | undefined {
  if (config.inlinePrompt) {
    return undefined;
  }
  if (VALID_PROMPTS.has(config.defaultPromptFile)) {
    return config.defaultPromptFile;
  }
  return resolve(config.outputPath, "prompts", config.defaultPromptFile);
}

// Parse open-specific args and separate codefetch args
function parseOpenArgs(args: string[]) {
  const argv = mri(args, {
    alias: {
      o: "output",
      e: "extension",
      v: "verbose",
      t: "project-tree",
      d: "dry-run",
      p: "prompt",
    },
    string: [
      "chat-url",
      "chat-model",
      "chat-prompt",
      // Standard codefetch options
      "output",
      "dir",
      "extension",
      "include-files",
      "exclude-files",
      "include-dir",
      "exclude-dir",
      "max-tokens",
      "output-path",
      "token-encoder",
      "token-limiter",
      "prompt",
      "var",
      "format",
    ],
    boolean: [
      "dry-run",
      "enable-line-numbers",
      "summary",
      "project-tree-skip-ignore-files",
      "exclude-markdown",
    ],
  });

  // Handle --no-browser (mri converts --no-X to X: false)
  // Also check for explicit --no-browser in args
  const noBrowser = argv.browser === false || args.includes("--no-browser");

  return {
    // Open-specific args
    chatUrl: (argv["chat-url"] as string) || DEFAULTS.url,
    chatModel: (argv["chat-model"] as string) || DEFAULTS.model,
    chatPrompt: (argv["chat-prompt"] as string) || DEFAULTS.prompt,
    noBrowser,
    // Pass through raw argv for codefetch args processing
    rawArgv: argv,
  };
}

// Generate codebase markdown using SDK
async function generateCodebase(
  source: string,
  config: CodefetchConfig & { inlinePrompt?: string }
): Promise<string> {
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

  if (config.excludeMarkdown) {
    ig.add(["*.md", "*.markdown", "*.mdx"]);
  }

  const files = await collectFiles(source, {
    ig,
    extensionSet: config.extensions ? new Set(config.extensions) : null,
    excludeFiles: config.excludeFiles || null,
    includeFiles: config.includeFiles || null,
    excludeDirs: config.excludeDirs || null,
    includeDirs: config.includeDirs || null,
    verbose: 0, // Suppress verbose output in open command
  });

  const markdown = await generateMarkdown(files, {
    maxTokens: config.maxTokens ? Number(config.maxTokens) : null,
    verbose: 0,
    projectTree: Number(config.projectTree || 0),
    tokenEncoder: (config.tokenEncoder as TokenEncoder) || "cl100k",
    disableLineNumbers: config.disableLineNumbers !== false,
    tokenLimiter: (config.tokenLimiter as TokenLimiter) || "truncated",
    promptFile: getPromptFile(config),
    inlinePrompt: config.inlinePrompt,
    templateVars: config.templateVars,
    projectTreeBaseDir: source,
    projectTreeSkipIgnoreFiles: Boolean(config.projectTreeSkipIgnoreFiles),
  });

  return markdown;
}

function printOpenHelp() {
  console.log(`
Usage: codefetch open [options]

Generates codebase, copies to clipboard, and opens browser to an AI chat.

Options:
  --chat-url <url>            AI chat URL (default: chatgpt.com)
  --chat-model <model>        Model parameter for URL (default: gpt-4.1-pro)
  --chat-prompt <text>        Message shown after opening
  --no-browser                Skip opening browser, just copy to clipboard
  -h, --help                  Display this help message

All standard codefetch options are also supported (e.g., -e, -t, --exclude-dir)

Examples:
  # Default: opens ChatGPT with gpt-4.1-pro
  codefetch open

  # Custom AI chat URL and model
  codefetch open --chat-url claude.ai --chat-model claude-3.5-sonnet

  # Combine with codefetch options
  codefetch open -e .ts,.js --exclude-dir node_modules -t 3

  # Just copy to clipboard without opening browser
  codefetch open --no-browser
`);
}

export default async function openCommand(rawArgs: mri.Argv) {
  // Handle help flag
  if (rawArgs.help || rawArgs.h) {
    printOpenHelp();
    return;
  }

  const args = parseOpenArgs(process.argv.slice(3)); // Skip 'node', 'cli', 'open'
  const cliOverrides = parseArgs(process.argv.slice(3));

  // Determine source directory
  const isPromptMode = args.rawArgv.p || args.rawArgv.prompt;
  const promptArg = args.rawArgv.p || args.rawArgv.prompt;
  const hasPromptMessage =
    isPromptMode &&
    typeof promptArg === "string" &&
    VALID_PROMPTS.has(promptArg) &&
    args.rawArgv._.length > 0;

  const source = resolve(
    hasPromptMessage ? "" : args.rawArgv._[0] || args.rawArgv.dir || ""
  );

  // Check project root
  const projectRoot = findProjectRoot(source);
  if (projectRoot !== source && !process.env.CI) {
    console.log(
      `Note: Running from ${source}, project root detected at ${projectRoot}`
    );
  }

  // Change to source directory
  process.chdir(source);

  // Load codefetch config with CLI overrides
  const config = await loadCodefetchConfig(source, cliOverrides);

  const s = spinner();

  try {
    // Step 1: Generate codebase
    s.start("Generating codebase...");
    const output = await generateCodebase(source, config);

    // Count tokens for display
    const totalTokens = await countTokens(output, config.tokenEncoder);

    // Step 2: Copy to clipboard
    s.message("Copying to clipboard...");
    await copyToClipboard(output);

    // Step 3: Open browser (unless --no-browser)
    if (!args.noBrowser) {
      s.message("Opening browser...");
      const chatUrl = buildChatUrl(args.chatUrl, args.chatModel);

      try {
        await openBrowser(chatUrl);
      } catch {
        // Browser opening failed, but clipboard succeeded
        s.stop("Ready! (browser could not be opened automatically)");
        console.log("");
        console.log(
          `📋 Codebase copied to clipboard (${totalTokens.toLocaleString()} tokens)`
        );
        console.log("");
        console.log(`🌐 Open this URL manually: ${chatUrl}`);
        console.log("");
        console.log(`💡 ${args.chatPrompt}`);
        return;
      }
    }

    // Success
    s.stop("Ready!");

    console.log("");
    console.log(
      `📋 Codebase copied to clipboard (${totalTokens.toLocaleString()} tokens)`
    );
    if (!args.noBrowser) {
      console.log(`🌐 Browser opened to ${args.chatUrl}`);
    }
    console.log("");
    console.log(`💡 ${args.chatPrompt}`);
    console.log("");
  } catch (error) {
    s.stop("Failed");
    throw error;
  }
}
