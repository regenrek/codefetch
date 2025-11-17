# codefetch

![Codefetch Cover](/public/cover.jpeg)

[![npm (tag)](https://img.shields.io/npm/v/codefetch)](https://www.npmjs.com/package/codefetch)

> Turn code repositories into AI-friendly Markdown documentation

Codefetch is a powerful tool that converts git repositories and local codebases into structured Markdown files optimized for Large Language Models (LLMs). It intelligently collects, processes, and formats code while respecting ignore patterns and providing token counting for various AI models.

## Key Features

- 📁 **Local Codebase Processing** - Convert entire codebases into AI-friendly Markdown
- 🔗 **Git Repository Support** - Fast GitHub API fetching with git clone fallback
- 🐙 **Multi-Platform Support** - Works with GitHub, GitLab, and Bitbucket
- 🎯 **Smart Filtering** - Respect .gitignore patterns and custom exclusions
- 📊 **Token Counting** - Track tokens for GPT-4, Claude, and other models
- 🚀 **CLI & SDK** - Use via command line or integrate programmatically
- 💾 **Intelligent Caching** - Speed up repeated fetches with smart caching
- 🌲 **Project Structure Visualization** - Generate tree views of your codebase
- ⚡ **GitHub API Integration** - Fetch repos without git using the GitHub API

Click here for a [Demo & Videos](https://x.com/kregenrek/status/1878487131099898269)

## Quick Start

```bash
# Analyze current directory
npx codefetch

# Analyze a GitHub repo (uses API - no git needed!)
npx codefetch --url github.com/facebook/react

# Analyze from GitLab or Bitbucket
npx codefetch --url gitlab.com/gitlab-org/gitlab
```

## Installation

### Using npx (recommended)

```bash
npx codefetch
```

### Global Installation

```bash
npm install -g codefetch
codefetch --help
```

### In Your Project

```bash
npm install --save-dev codefetch
# Add to package.json scripts
```

## Basic Examples

### Local Codebase

```bash
# Basic usage - outputs to codefetch/codebase.md
npx codefetch

# Include only TypeScript files with tree view
npx codefetch -e ts,tsx -t 3

# Generate with AI prompt template
npx codefetch -p improve --max-tokens 50000
```

### Git Repository Fetching

```bash
# Analyze a GitHub repository (uses GitHub API by default - no git required!)
npx codefetch --url github.com/vuejs/vue --branch main -e js,ts

# Private repository with token
npx codefetch --url github.com/myorg/private-repo --github-token ghp_xxxxx

# Force git clone instead of API
npx codefetch --url github.com/user/repo --no-api

# Web crawling with advanced options
npx codefetch --url example.com/docs --max-pages 50 --max-depth 3
```

Include or exclude specific files and directories:
```bash
# Exclude node_modules and public directories
npx codefetch --exclude-dir test,public

# Include only TypeScript files
npx codefetch --include-files "*.ts" -o typescript-only.md

# Include src directory, exclude test files
npx codefetch --include-dir src --exclude-files "*.test.ts" -o src-no-tests.md
```

Dry run (only output to console)

```bash
npx codefetch --d
```

Count tokens only (without generating markdown file)

```bash
# Count tokens with default encoder
npx codefetch -c

# Count tokens with specific encoder
npx codefetch -c --token-encoder cl100k

# Count tokens for specific file types
npx codefetch -c -e .ts,.js --token-encoder o200k
```

If no output file is specified (`-o` or `--output`), it will print to `codefetch/codebase.md`

## Options

### General Options

| Option                          | Description                                                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-o, --output <file>`           | Specify output filename (defaults to codebase.md). Note: If you include "codefetch/" in the path, it will be automatically stripped to avoid double-nesting |
| `--dir <path>`                  | Specify the directory to scan (defaults to current directory)                                                                                               |
| `--max-tokens <number>`         | Limit output tokens (default: 500,000)                                                                                                                      |
| `-e, --extension <ext,...>`     | Filter by file extensions (e.g., .ts,.js)                                                                                                                   |
| `--token-limiter <type>`        | Token limiting strategy when using --max-tokens (sequential, truncated)                                                                                     |
| `--include-files <pattern,...>` | Include specific files (supports patterns like \*.ts)                                                                                                       |
| `--exclude-files <pattern,...>` | Exclude specific files (supports patterns like \*.test.ts)                                                                                                  |
| `--include-dir <dir,...>`       | Include specific directories                                                                                                                                |
| `--exclude-dir <dir,...>`       | Exclude specific directories                                                                                                                                |
| `-v, --verbose [level]`         | Show processing information (0=none, 1=basic, 2=debug)                                                                                                      |
| `-t, --project-tree [depth]`    | Generate visual project tree (optional depth, default: 2)                                                                                                   |
| `--token-encoder <type>`        | Token encoding method (simple, p50k, o200k, cl100k)                                                                                                         |
| `--disable-line-numbers`        | Disable line numbers in output                                                                                                                              |
| `-d, --dry-run`                 | Output markdown to stdout instead of file                                                                                                                   |
| `-c, --token-count-only`        | Output only the token count without generating markdown file                                                                                                |

### Git Repository Options

| Option                     | Description                                                              |
| -------------------------- | ------------------------------------------------------------------------ |
| `--url <URL>`              | Fetch and analyze content from a git repository or website URL           |
| `--branch <name>`          | Git branch/tag/commit to fetch (for repositories)                       |
| `--no-cache`               | Skip cache and fetch fresh content                                       |
| `--cache-ttl <hours>`      | Cache time-to-live in hours (default: 1)                                |
| `--no-api`                 | Disable GitHub API and use git clone instead                            |
| `--github-token <token>`   | GitHub API token for private repos (or set GITHUB_TOKEN env var)        |

### Web Crawling Options

| Option                   | Description                                                |
| ------------------------ | ---------------------------------------------------------- |
| `--max-pages <number>`   | Maximum pages to crawl (default: 50)                       |
| `--max-depth <number>`   | Maximum crawl depth (default: 2)                           |
| `--ignore-robots`        | Ignore robots.txt restrictions                             |
| `--ignore-cors`          | Ignore CORS restrictions                                   |

All options that accept multiple values use comma-separated lists. File patterns support simple wildcards:

- `*` matches any number of characters
- `?` matches a single character

### Project Tree

You can generate a visual tree representation of your project structure:

```bash
# Generate tree with default depth (2 levels)
npx codefetch --project-tree

# Generate tree with custom depth
npx codefetch -t 3

# Generate tree and save code to file
npx codefetch -t 2 -o output.md
```

Example output:

```
Project Tree:
└── my-project
    ├── src
    │   ├── index.ts
    │   ├── types.ts
    │   └── utils
    ├── tests
    │   └── index.test.ts
    └── package.json
```

### Using Prompts

You can add predefined or custom prompts to your output:

```bash
# Use default prompt (looks for codefetch/prompts/default.md)
npx codefetch -p
npx codefetch --prompt

# Use built-in prompts
npx codefetch -p fix # fixes codebase
npx codefetch -p improve # improves codebase
npx codefetch -p codegen # generates code
npx codefetch -p testgen # generates tests

# Use custom prompts
npx codefetch --prompt custom-prompt.md
npx codefetch -p my-architect.txt
```

#### Custom Prompts

Create custom prompts in `codefetch/prompts/` directory:

1. Create a markdown file (e.g., `codefetch/prompts/my-prompt.md`)
2. Use it with `--prompt my-prompt.md`

You can also set a default prompt in your `codefetch.config.mjs`:

```js
export default {
  defaultPromptFile: "dev", // Use built-in prompt
}

export default {
  defaultPromptFile: "custom-prompt.md", // Use custom prompt file
}
```

The prompt resolution order is:

1. CLI argument (`-p` or `--prompt`)
2. Config file prompt setting
3. No prompt if neither is specified

When using just `-p` or `--prompt` without a value, codefetch will look for `codefetch/prompts/default.md`.

## Token Limiting Strategies

When using `--max-tokens`, you can control how tokens are distributed across files using the `--token-limiter` option:

```bash
# Sequential mode - process files in order until reaching token limit
npx codefetch --max-tokens 500 --token-limiter sequential

# Truncated mode (default) - distribute tokens evenly across all files
npx codefetch --max-tokens 500 --token-limiter truncated
```

![tokenlimiter](/public/tokenlimiter.png)

- `sequential`: Processes files in order until the total token limit is reached. Useful when you want complete content from the first files.
- `truncated`: Distributes tokens evenly across all files, showing partial content from each file. This is the default mode and is useful for getting an overview of the entire codebase.

## Ignoring Files

codefetch supports two ways to ignore files:

1. `.gitignore` - Respects your project's existing `.gitignore` patterns
2. `.codefetchignore` - Additional patterns specific to codefetch

The `.codefetchignore` file works exactly like `.gitignore` and is useful when you want to ignore files that aren't in your `.gitignore`.

### Default Ignore Patterns

Codefetch uses a set of default ignore patterns to exclude common files and directories that typically don't need to be included in code reviews or LLM analysis.

You can view the complete list of default patterns in [default-ignore.ts](packages/sdk/src/default-ignore.ts).

## Token Counting

Codefetch supports different token counting methods to match various AI models:

- `simple`: Basic word-based estimation (not very accurate but fastest!)
- `p50k`: GPT-3 style tokenization
- `o200k`: gpt-4o style tokenization
- `cl100k`: GPT-4 style tokenization

Select the appropriate encoder based on your target model:

```bash
# For GPT-4o
npx codefetch --token-encoder o200k
```

## Output Directory

By default (unless using --dry-run) codefetch will:

1. Create a `codefetch/` directory in your project
2. Store all output files in this directory

This ensures that:

- Your fetched code is organized in one place
- The output directory won't be fetched so we avoid fetching the codebase again

Add `codefetch/` to your `.gitignore` file to avoid committing the fetched codebase.

## Use with AI Tools

You can use this command to create code-to-markdown in [bolt.new](https://bolt.new), [cursor.com](https://cursor.com), ... and ask the AI chat for guidance about your codebase.

## Packages

Codefetch is organized as a monorepo with multiple packages:

### [codefetch](./packages/cli/README.md)

Command-line interface for Codefetch with web fetching capabilities.

```bash
npm install -g codefetch
```

**Features:**

- Full CLI with all options
- Website crawling and conversion
- Git repository cloning
- Built-in caching system
- Progress reporting

[Read the full CLI documentation →](./packages/cli/README.md)

### [codefetch-sdk](./packages/sdk/README.md)

Core SDK for programmatic usage in your applications.

```bash
npm install codefetch-sdk@latest
```

**Features:**
- 🎯 **Unified `fetch()` API** - Single method for all sources
- 🚀 **Zero-config defaults** - Works out of the box
- 📦 **Optimized bundle** - Small footprint for edge environments
- 🔧 **Full TypeScript support** - Complete type safety
- 🌐 **Enhanced web support** - GitHub API integration

**Quick Start:**
```typescript
import { fetch } from 'codefetch-sdk';

// Local codebase
const result = await fetch({
  source: './src',
  extensions: ['.ts', '.tsx'],
  maxTokens: 50_000,
});

// GitHub repository
const result = await fetch({
  source: 'https://github.com/facebook/react',
  branch: 'main',
  extensions: ['.js', '.ts'],
});

console.log(result.markdown); // AI-ready markdown
```

[Read the full SDK documentation →](./packages/sdk/README.md)

### [codefetch-sdk/worker](./packages/sdk/README-Worker.md)

**Cloudflare Workers optimized build** - Zero file system dependencies.

```typescript
import { fetch } from 'codefetch-sdk/worker';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const result = await fetch({
      source: 'https://github.com/vercel/next.js',
      maxFiles: 50,
      extensions: ['.ts', '.tsx'],
    });

    return new Response(result.markdown, {
      headers: { 'Content-Type': 'text/markdown' }
    });
  }
};
```

**Features:**
- 🚀 **Zero nodejs_compat required** - Uses native Web APIs
- 📦 **35.4KB bundle size** - Optimized for edge performance
- 🔒 **Private repo support** - GitHub token authentication
- 🌊 **Native streaming** - Memory-efficient processing

[Read the full Worker documentation →](./packages/sdk/README-Worker.md)

### [codefetch-mcp-server](./packages/mcp/README.md) (Coming soon)

Model Context Protocol server for AI assistants like Claude.

**Features:**

- MCP tools for codebase analysis
- Direct integration with Claude Desktop
- Token counting tools
- Configurable via environment variables

[Read the full MCP documentation →](./packages/mcp/README.md)

## Integrate into Your Project

Initialize your project with codefetch:

```bash
npx codefetch init
```

This will:

1. Create a `.codefetchignore` file for excluding files
2. Generate a `codefetch.config.mjs` with your preferences
3. Set up the project structure

### Configuration

Create a `.codefetchrc` file in your project root:

```json
{
  "extensions": [".ts", ".tsx", ".js", ".jsx"],
  "excludeDirs": ["node_modules", "dist", "coverage"],
  "maxTokens": 100000,
  "outputFile": "codebase.md",
  "tokenEncoder": "cl100k"
}
```

Or use `codefetch.config.mjs` for more control:

```js
export default {
  // Output settings
  outputPath: "codefetch",
  outputFile: "codebase.md",
  maxTokens: 999_000,

  // Processing options
  projectTree: 2,
  tokenEncoder: "cl100k",
  tokenLimiter: "truncated",

  // File filtering
  extensions: [".ts", ".js"],
  excludeDirs: ["test", "dist"],

  // AI/LLM settings
  trackedModels: ["gpt-4", "claude-3-opus", "gpt-3.5-turbo"],
};
```

## Links

- X/Twitter: [@kregenrek](https://x.com/kregenrek)
- Bluesky: [@kevinkern.dev](https://bsky.app/profile/kevinkern.dev)

## Courses

- Learn Cursor AI: [Ultimate Cursor Course](https://www.instructa.ai/en/cursor-ai)
- Learn to build software with AI: [AI Builder Hub](https://www.instructa.ai/en/ai-builder-hub)

## See my other projects:

- [aidex](https://github.com/regenrek/aidex) - AI model information 

## Credits

This project was inspired by

- [sitefetch](https://github.com/egoist/sitefetch) CLI made by [@egoist](https://github.com/egoist). While sitefetch is great for fetching documentation and websites, codefetch focuses on fetching local codebases for AI analysis.
[unjs](https://github.com/unjs) - for bringing us the best javascript tooling system

