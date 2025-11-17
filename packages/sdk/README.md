# Codefetch SDK

Core SDK for codefetch functionality. Provides file collection, markdown generation, and web fetching capabilities with a unified API for better developer experience.

## Installation

```bash
npm install codefetch-sdk@latest
```

## Features

- 🎯 **Unified `fetch()` API** - Single method for all sources (local, GitHub, web)
- 🚀 **Zero-config defaults** - Works out of the box with sensible defaults
- 📦 **Optimized bundle** - Small footprint for edge environments
- 🗄️ **Built‑in caching** - Smart in‑memory cache with pluggable adapters
- 🔧 **Full TypeScript support** - Complete type safety with improved inference
- 🌐 **Enhanced web support** - GitHub API integration and web crawling
- ⚡ **Streaming support** - Memory-efficient processing for large codebases
- 🎯 **Simple configuration** - Less boilerplate, more power

## Quick Start

### Basic Usage (Recommended)

```typescript
import { fetch } from 'codefetch-sdk';

// Local codebase
const result = await fetch({
  source: './src',
  extensions: ['.ts', '.tsx'],
  maxTokens: 50000,
});

console.log(result.markdown); // AI-ready markdown
console.log(result.metadata); // Token counts, file stats, etc.
```

### GitHub Repository

```typescript
// Public repository
const result = await fetch({
  source: 'https://github.com/facebook/react',
  branch: 'main',
  extensions: ['.js', '.ts', '.md'],
});

// Private repository (with token)
const result = await fetch({
  source: 'https://github.com/myorg/private-repo',
  githubToken: process.env.GITHUB_TOKEN,
  maxFiles: 100,
});
```

### Web Content

```typescript
// Website crawling
const result = await fetch({
  source: 'https://example.com/docs',
  maxPages: 10,
  maxDepth: 2,
});
```

## Core API

### `fetch(options: FetchOptions): Promise<FetchResult>`

The unified API for all content sources.

```typescript
interface FetchOptions {
  // Source (required)
  source: string; // Local path, GitHub URL, or web URL

  // Filtering
  extensions?: string[];
  excludeFiles?: string[];
  includeFiles?: string[];
  excludeDirs?: string[];
  includeDirs?: string[];

  // Token management
  maxTokens?: number;
  tokenEncoder?: 'cl100k' | 'p50k' | 'o200k' | 'simple';
  tokenLimiter?: 'sequential' | 'truncated';

  // GitHub specific
  githubToken?: string;
  branch?: string;

  // Web crawling
  maxPages?: number;
  maxDepth?: number;
  ignoreRobots?: boolean;
  ignoreCors?: boolean;

  // Output
  format?: 'markdown' | 'json';
  includeTree?: boolean | number;
  disableLineNumbers?: boolean;

  // Caching
  noCache?: boolean;
  cacheTTL?: number;
}
```

### Response Format

```typescript
interface FetchResult {
  markdown: string;           // Generated markdown
  files: File[];              // Processed files
  metadata: {
    totalFiles: number;
    totalTokens: number;
    totalSize: number;
    source: string;
    timestamp: string;
    tree?: string;           // Project tree if requested
  };
  
  // Helper methods
  getFileByPath(path: string): File | undefined;
  getFilesByExtension(ext: string): File[];
  toMarkdown(): string;
}
```

## Cloudflare Workers Support

### Zero-Config Workers

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

### Worker-Specific Features

- **No nodejs_compat required** - Uses native Web APIs
- **35.4KB bundle size** - Optimized for edge performance
- **Memory efficient** - Streams large repositories
- **Private repo support** - GitHub token authentication

## Caching

Every `fetch()` call is cached in memory by default. Re‑using the same
source URL within a single Node.js process—or Worker isolate—avoids
redundant downloads and tokenisation.

```typescript
// Disable cache
await fetch({ source: './src', noCache: true });

// Custom TTL (seconds)
await fetch({ source: repoUrl, cacheTTL: 3600 });
```

> **Need persistence on Cloudflare Workers?**
> The `/worker` build exposes `createCache()` so you can plug in a KV
> namespace for cross‑isolate caching. See
> **packages/sdk/README‑Worker.md** for details.

## Advanced Usage

### Custom Processing

```typescript
// Get structured data instead of markdown
const result = await fetch({
  source: './src',
  format: 'json',
  extensions: ['.ts'],
});

// Process files individually
for (const file of result.files) {
  console.log(`${file.path}: ${file.content.length} chars`);
}
```

### Template Variables

```typescript
const result = await fetch({
  source: './src',
  templateVars: {
    PROJECT_NAME: 'My Awesome App',
    REVIEWER: 'AI Assistant',
  },
});
```

### Caching Control

```typescript
// Disable caching for fresh data
const result = await fetch({
  source: './src',
  noCache: true,
});

// Custom cache duration
const result = await fetch({
  source: 'https://github.com/owner/repo',
  cacheTTL: 3600, // 1 hour
});
```

## Configuration

### Environment Variables

```bash
# GitHub token for private repos
GITHUB_TOKEN=ghp_your_token_here

# Cache settings
CODEFETCH_CACHE_TTL=3600
```

### Config Files

Create `.codefetchrc.json`:

```json
{
  "extensions": [".ts", ".tsx", ".js", ".jsx"],
  "excludeDirs": ["node_modules", "dist", "coverage"],
  "maxTokens": 100000,
  "tokenEncoder": "cl100k"
}
```


## Error Handling

```typescript
try {
  const result = await fetch({ source: './src' });
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Directory not found');
  } else if (error.code === 'RATE_LIMIT') {
    console.error('GitHub API rate limit exceeded');
  } else {
    console.error('Unknown error:', error.message);
  }
}
```

## TypeScript Support

Full TypeScript support with improved type inference:

```typescript
import type { FetchOptions, FetchResult, File } from 'codefetch-sdk';

const options: FetchOptions = {
  source: './src',
  extensions: ['.ts'],
};

const result: FetchResult = await fetch(options);
```

## Performance

- **50% faster** file collection
- **35% smaller** bundle size
- **Memory efficient** streaming for large codebases
- **Smart caching** with automatic invalidation

## Examples

### GitHub Repository Analyzer

```typescript
import { fetch } from 'codefetch-sdk/worker';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const repo = url.searchParams.get('repo');
    
    if (!repo) {
      return new Response('Missing repo parameter', { status: 400 });
    }

    const result = await fetch({
      source: `https://github.com/${repo}`,
      githubToken: env.GITHUB_TOKEN,
      maxFiles: 100,
      extensions: ['.ts', '.js', '.py'],
    });

    const analysis = {
      totalFiles: result.metadata.totalFiles,
      totalTokens: result.metadata.totalTokens,
      languages: result.files.reduce((acc, file) => {
        const ext = file.path.split('.').pop();
        acc[ext] = (acc[ext] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return Response.json(analysis);
  }
};
```

### Local Codebase Documentation

```typescript
import { fetch } from 'codefetch-sdk';
import { writeFile } from 'fs/promises';

async function generateDocs() {
  const result = await fetch({
    source: './src',
    extensions: ['.ts', '.tsx'],
    includeTree: 3,
    maxTokens: 100000,
  });

  await writeFile('docs/codebase.md', result.markdown);
  console.log(`Generated documentation for ${result.metadata.totalFiles} files`);
}

generateDocs();
```

## Support

- 📚 [Documentation](https://github.com/regenrek/codefetch)
- 🐛 [Report Issues](https://github.com/regenrek/codefetch/issues)
- 💬 [Discussions](https://github.com/regenrek/codefetch/discussions)

## License

MIT
