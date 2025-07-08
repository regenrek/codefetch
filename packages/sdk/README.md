# codefetch-sdk

[![SDK Tests](https://github.com/regenrek/codefetch/actions/workflows/sdk-test.yml/badge.svg)](https://github.com/regenrek/codefetch/actions/workflows/sdk-test.yml)
[![npm version](https://badge.fury.io/js/codefetch-sdk.svg)](https://www.npmjs.com/package/codefetch-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The core SDK for Codefetch - a powerful tool for converting codebases into AI-friendly markdown formats.

## Installation

```bash
npm install codefetch-sdk
# or
yarn add codefetch-sdk
# or
pnpm add codefetch-sdk
```

## Overview

The SDK provides programmatic access to all Codefetch functionality, allowing you to:

- Collect files from a codebase with intelligent filtering
- Generate markdown documentation with project structure
- Count tokens for various AI models
- Apply prompt templates
- Configure ignore patterns and file filtering

## Basic Usage

### Using the fetch() API (Recommended)

```typescript
import { fetch } from "codefetch-sdk";

// Fetch as markdown (default)
const markdown = await fetch({
  source: "/path/to/project",
  extensions: [".ts", ".tsx", ".js", ".jsx"],
  maxTokens: 100000,
});

// Fetch as JSON for structured access
const result = await fetch({
  source: "/path/to/project",
  format: "json",
  extensions: [".ts", ".tsx"],
});

// Access files in JSON format
if (result instanceof FetchResultImpl) {
  // Get a specific file
  const file = result.getFileByPath("src/index.ts");
  console.log(file.content);

  // Get all files as array
  const allFiles = result.getAllFiles();

  // Convert to markdown
  const markdown = result.toMarkdown();
}
```

### Using Low-Level APIs

```typescript
import {
  collectFiles,
  generateMarkdown,
  countTokens,
  DEFAULT_IGNORE_PATTERNS,
} from "codefetch-sdk";
import ignore from "ignore";

// Set up ignore patterns
const ig = ignore().add(DEFAULT_IGNORE_PATTERNS);

// Collect files from a directory
const files = await collectFiles("/path/to/project", {
  ig,
  extensionSet: new Set([".ts", ".tsx", ".js", ".jsx"]),
  excludeFiles: null,
  includeFiles: null,
  excludeDirs: null,
  includeDirs: null,
  verbose: 1,
});

// Generate markdown
const markdown = await generateMarkdown(files, {
  maxTokens: 100000,
  verbose: 1,
  projectTree: 2,
  tokenEncoder: "cl100k",
  disableLineNumbers: false,
  tokenLimiter: "truncated",
  templateVars: {
    PROJECT_NAME: "My Project",
  },
});

// Count tokens
const tokenCount = await countTokens(markdown, "cl100k");
console.log(`Generated ${tokenCount} tokens`);
```

## API Reference

### File Collection

#### `collectFiles(path: string, options: CollectFilesOptions): Promise<File[]>`

Collects files from a directory with filtering options.

Options:

- `ig`: An ignore instance for pattern matching
- `extensionSet`: Set of file extensions to include (e.g., `new Set(['.ts', '.js'])`)
- `excludeFiles`: Array of file patterns to exclude
- `includeFiles`: Array of file patterns to explicitly include
- `excludeDirs`: Array of directory names to exclude
- `includeDirs`: Array of directory names to explicitly include
- `verbose`: Verbosity level (0-3)

### Markdown Generation

#### `generateMarkdown(files: File[], options: GenerateMarkdownOptions): Promise<string>`

Generates AI-friendly markdown from collected files.

Options:

- `maxTokens`: Maximum token limit (null for no limit)
- `verbose`: Verbosity level (0-3)
- `projectTree`: Project tree depth (0 for no tree, 1+ for tree levels)
- `tokenEncoder`: Token encoding model ('cl100k' | 'p50k' | 'r50k' | 'o200k')
- `disableLineNumbers`: Disable line numbers in code blocks
- `tokenLimiter`: Strategy for handling token limits ('truncated' | 'spread')
- `promptFile`: Path to prompt template file
- `templateVars`: Variables for template substitution

### Token Counting

#### `countTokens(text: string, encoder: TokenEncoder): Promise<number>`

Counts tokens in text using specified encoder.

Supported encoders:

- `'cl100k'` - Used by GPT-4, GPT-3.5-turbo, text-embedding-ada-002
- `'p50k'` - Used by older GPT-3 models
- `'r50k'` - Used by older models like davinci
- `'o200k'` - Used by newer OpenAI models

### Configuration

#### `loadCodefetchConfig(cwd: string, args?: any): Promise<Config>`

Loads configuration from `.codefetchrc` files and merges with CLI arguments.

#### `DEFAULT_IGNORE_PATTERNS`

Default patterns for ignoring files and directories:

```
node_modules/
.git/
dist/
build/
coverage/
.env*
*.log
.DS_Store
*.min.js
*.min.css
# ... and more
```

### Prompts

#### `processPromptTemplate(promptFile: string, vars?: Record<string, string>): Promise<string>`

Processes a prompt template file with variable substitution.

Variables are replaced using `{{VARIABLE_NAME}}` syntax.

## Advanced Features

### Token Limiting Strategies

**Truncated** (default): Includes files until token limit is reached, then stops.

**Spread**: Distributes tokens across all files, showing partial content from each.

### Custom Ignore Patterns

Create a `.codefetchignore` file in your project root:

```
# Custom patterns
*.test.ts
*.spec.js
__tests__/
tmp/
```

### Template Variables

Use template variables in prompt files:

```markdown
# Code Review for {{PROJECT_NAME}}

Please review the following {{LANGUAGE}} code:

{{CODE}}
```

## Model Support

The SDK tracks token limits for various AI models:

```typescript
import { SUPPORTED_MODELS, fetchModels } from "codefetch-sdk";

// Get model information
const { modelDb } = await fetchModels(["gpt-4", "claude-3-opus"]);
```

## Error Handling

The SDK throws descriptive errors for common issues:

```typescript
try {
  const files = await collectFiles("./src", options);
} catch (error) {
  if (error.code === "ENOENT") {
    console.error("Directory not found");
  }
}
```

## Cloudflare Workers Support

The SDK provides a Worker-compatible build that runs in Cloudflare Workers with the `nodejs_compat` flag:

### Installation

```bash
npm install @codefetch/sdk
```

### Worker Configuration

Create a `wrangler.toml`:

```toml
name = "codefetch-worker"
main = "src/worker.ts"
compatibility_date = "2025-07-07"
compatibility_flags = ["nodejs_compat"]
```

### Usage in Workers

```typescript
import { fetchFromWeb } from "@codefetch/sdk/worker";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Fetch from a website
    const webResult = await fetchFromWeb("https://example.com", {
      maxPages: 10,
      maxDepth: 1,
    });
    
    // Fetch from GitHub (via fetchFromWeb with GitHub URL)
    const githubResult = await fetchFromWeb("https://github.com/owner/repo", {
      githubToken: env.GITHUB_TOKEN,
      maxFiles: 50,
      extensions: [".ts", ".js"],
    });
    
    return new Response(webResult.markdown, {
      headers: { "Content-Type": "text/markdown" },
    });
  },
} satisfies ExportedHandler<Env>;
```

### Worker Limitations

- **No local file system access** - `collectFiles` and `fetchFiles` are not available
- **No git clone support** - Only GitHub ZIP API is supported
- **10MB storage limit** - Large repositories may exceed Worker ephemeral storage
- **Content-Length required** - Archives without size headers will be rejected

### Worker-Safe Exports

The `/worker` entry point only exports APIs that work in Workers:
- `fetchFromWeb` - Crawl and convert websites to markdown (including GitHub repos)
- `countTokens` - Count tokens for AI models
- `htmlToMarkdown` - Convert HTML to markdown
- `generateMarkdown` - Generate markdown from files
- Prompt templates and utilities

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import type {
  File,
  Config,
  TokenEncoder,
  TokenLimiter,
  CollectFilesOptions,
  GenerateMarkdownOptions,
} from "codefetch-sdk";
```

## Contributing

See the [main repository](https://github.com/codefetch-ai/codefetch) for contribution guidelines.

## License

MIT
