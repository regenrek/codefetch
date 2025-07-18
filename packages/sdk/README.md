# Codefetch SDK

Core SDK for codefetch functionality. Provides file collection, markdown generation, and web fetching capabilities.

## Installation

```bash
npm install codefetch-sdk
```

## Features

- File system traversal with gitignore support
- Markdown generation with token counting
- Web content fetching (GitHub repos, URLs)
- Multiple token encoders (cl100k, p50k, o200k)
- Configurable file filtering and exclusion
- Project tree visualization
- Template variable support

## Cloudflare Workers Support

The SDK provides a specialized `/worker` export for Cloudflare Workers:

```javascript
import { streamGitHubTarball, fetchFromWeb } from 'codefetch-sdk/worker';
```

**Key benefits:**
- ✅ Zero file system dependencies
- ✅ 35.4KB optimized bundle
- ✅ Native DecompressionStream support
- ✅ No nodejs_compat flag required

See [README-Worker.md](./README-Worker.md) for complete Worker documentation.

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

## GitHub API Token Setup

The SDK can access private GitHub repositories and increase API rate limits by using a GitHub personal access token. Here's how to generate and use one:

### Step 1: Generate a GitHub Personal Access Token

1. **Sign in to GitHub** and navigate to your account settings
2. **Go to Developer settings** → Personal access tokens → Tokens (classic)
   - Or directly visit: https://github.com/settings/tokens
3. **Click "Generate new token"** → "Generate new token (classic)"
4. **Configure your token:**
   - **Note**: Give it a descriptive name (e.g., "codefetch-sdk")
   - **Expiration**: Choose an appropriate expiration time
   - **Scopes**: Select the following permissions:
     - `repo` (Full control of private repositories) - if you need to access private repos
     - `public_repo` (Access public repositories) - for public repos only
5. **Generate the token** and copy it immediately (you won't be able to see it again)

### Step 2: Use the Token in Your Code

#### Option A: Environment Variable (Recommended)
```bash
# Set in your shell
export GITHUB_TOKEN="ghp_your_token_here"

# Or in a .env file
GITHUB_TOKEN=ghp_your_token_here
```

The SDK will automatically use the `GITHUB_TOKEN` environment variable:
```typescript
// No need to pass token - it reads from process.env.GITHUB_TOKEN
const result = await fetch({
  source: "https://github.com/owner/private-repo",
});
```

#### Option B: Pass Directly in Code
```typescript
const result = await fetch({
  source: "https://github.com/owner/private-repo",
  githubToken: "ghp_your_token_here", // Only for web fetch
});

// Or with the low-level API
const client = new GitHubApiClient(owner, repo, logger, {
  token: "ghp_your_token_here",
});
```

### Step 3: For Cloudflare Workers

Store your token as a secret:
```bash
wrangler secret put GITHUB_TOKEN
```

Then use it in your worker:
```typescript
export interface Env {
  GITHUB_TOKEN: string;
}

const result = await fetchFromWeb("https://github.com/owner/repo", {
  githubToken: env.GITHUB_TOKEN,
});
```

### Benefits of Using a Token

- **Access private repositories**: Required for non-public repos
- **Increased rate limits**: From 60 to 5,000 requests per hour
- **Avoid rate limiting**: Essential for fetching large repositories
- **Consistent access**: No interruptions from hitting rate limits

### Security Best Practices

1. **Never commit tokens to version control**
2. **Use environment variables or secrets management**
3. **Limit token scope to minimum required permissions**
4. **Rotate tokens regularly**
5. **Use different tokens for different environments**

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
