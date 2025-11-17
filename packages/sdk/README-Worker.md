# Codefetch SDK for Cloudflare Workers

The `codefetch-sdk` provides a specialized `/worker` export optimized for Cloudflare Workers environments, with zero file system dependencies and native Web Streams support.

## Installation

```bash
npm install codefetch-sdk@latest
# or
pnpm add codefetch-sdk@latest
# or
yarn add codefetch-sdk@latest
```

## Worker-Specific Import

```javascript
// Use the /worker export for Cloudflare Workers
import { fetch } from 'codefetch-sdk/worker';
```

## Features

- 🎯 **Unified `fetch()` API** - Single method for GitHub repos, web content, and more
- 🚀 **Zero nodejs_compat required** - Uses native Web APIs
- 📦 **Optimized bundle** - Only **≈ 24 KB** gzipped for edge performance
- 🗄️ **Built‑in caching** - Transparent per‑request memoization with optional KV persistence
- 🌊 **Native streaming** - Memory‑efficient processing
- 🔒 **Private repo support** - GitHub token authentication
- ⚡ **Fast GitHub fetching** - Efficient repository processing
- 🎯 **Simple configuration** - Minimal boilerplate

## Quick Start

### Basic Worker

```javascript
export default {
  async fetch(request) {
    const result = await fetch({
      source: 'https://github.com/facebook/react',
      extensions: ['.js', '.ts', '.md'],
      maxFiles: 50
    });

    return new Response(result.markdown, {
      headers: { 'Content-Type': 'text/markdown' }
    });
  }
};
```

### Private Repository

```javascript
export default {
  async fetch(request, env) {
    const result = await fetch({
      source: 'https://github.com/myorg/private-repo',
      githubToken: env.GITHUB_TOKEN,
      extensions: ['.ts', '.tsx'],
      maxFiles: 100
    });

    return new Response(result.markdown);
  }
};
```

### Web Content Crawling

```javascript
export default {
  async fetch(request) {
    const result = await fetch({
      source: 'https://example.com/docs',
      maxPages: 10,
      maxDepth: 2
    });

    return Response.json({
      pages: result.metadata.totalPages,
      tokens: result.metadata.totalTokens,
      content: result.markdown
    });
  }
};
```

## API Reference

### `fetch(options: FetchOptions): Promise<FetchResult>`

The unified API for all content sources in Workers.

```typescript
interface FetchOptions {
  // Source (required)
  source: string; // GitHub URL, web URL, or local path (ignored in Workers)

  // Filtering
  extensions?: string[];
  excludeFiles?: string[];
  includeFiles?: string[];
  excludeDirs?: string[];
  includeDirs?: string[];

  // Token management
  maxTokens?: number;
  maxFiles?: number;
  tokenEncoder?: 'cl100k' | 'p50k' | 'o200k' | 'simple';
  tokenLimiter?: 'sequential' | 'truncated';

  // GitHub specific
  githubToken?: string;
  branch?: string;

  // Web crawling
  maxPages?: number;
  maxDepth?: number;

  // Output
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
  markdown: string;
  files: File[];
  metadata: {
    totalFiles: number;
    totalTokens: number;
    totalSize: number;
    source: string;
    timestamp: string;
    tree?: string;
    totalPages?: number; // For web crawling
  };
}
```

## Caching& KV Persistence

`codefetch-sdk/worker` ships with an **in‑memory LRU cache** that lives
for the lifetime of the Cloudflare Worker isolate. When you call
`fetch()` with the same parameters inside the same isolate it returns
cached results, saving GitHub quota and reducing latency.

```javascript
// Disable caching for a single request
await fetch({ source: repoUrl, noCache: true });
```

## Real-World Examples

### 1. GitHub Repository Analyzer API

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const repo = url.searchParams.get('repo'); // format: owner/name
    
    if (!repo) {
      return new Response('Missing repo parameter', { status: 400 });
    }

    const [owner, name] = repo.split('/');
    
    try {
      // Cache the results
      const cacheKey = new Request(`https://cache.example.com/${owner}/${name}`);
      const cache = caches.default;
      
      let response = await cache.match(cacheKey);
      if (response) {
        return response;
      }

      // Fetch repository
      const result = await fetch({
        source: `https://github.com/${owner}/${name}`,
        githubToken: env.GITHUB_TOKEN,
        extensions: ['.ts', '.js', '.py', '.go'],
        excludeDirs: ['node_modules', 'vendor', '.git'],
        maxFiles: 100
      });

      // Analyze code
      const analysis = {
        totalFiles: result.metadata.totalFiles,
        totalTokens: result.metadata.totalTokens,
        languages: {},
        totalSize: 0,
        largestFiles: []
      };

      for (const file of result.files) {
        const ext = file.path.split('.').pop();
        analysis.languages[ext] = (analysis.languages[ext] || 0) + 1;
        analysis.totalSize += file.content.length;
        
        if (file.content.length > 10000) {
          analysis.largestFiles.push({
            path: file.path,
            size: file.content.length
          });
        }
      }

      response = Response.json(analysis, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600'
        }
      });

      // Cache for 1 hour
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      
      return response;
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
};
```

### 2. Documentation Generator

```javascript
export default {
  async fetch(request, env) {
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get('repo');
    const maxTokens = parseInt(searchParams.get('maxTokens') || '50000');

    const result = await fetch({
      source: `https://github.com/${repo}`,
      githubToken: env.GITHUB_TOKEN,
      extensions: ['.md', '.mdx', '.ts', '.js'],
      excludeDirs: ['node_modules', 'test'],
      maxTokens,
      includeTree: true
    });

    return new Response(result.markdown, {
      headers: {
        'Content-Type': 'text/markdown',
        'X-Token-Count': result.metadata.totalTokens.toString()
      }
    });
  }
};
```

### 3. Code Search API

```javascript
export default {
  async fetch(request) {
    const { repo, query } = await request.json();
    
    const result = await fetch({
      source: `https://github.com/${repo}`,
      extensions: ['.js', '.ts', '.jsx', '.tsx'],
      maxFiles: 200
    });

    const results = result.files
      .filter(file => file.content.includes(query))
      .map(file => {
        const lines = file.content.split('\n');
        const matches = [];
        
        lines.forEach((line, index) => {
          if (line.includes(query)) {
            matches.push({
              line: index + 1,
              content: line.trim(),
              context: lines.slice(
                Math.max(0, index - 2),
                Math.min(lines.length, index + 3)
              ).join('\n')
            });
          }
        });

        return { path: file.path, matches };
      })
      .filter(result => result.matches.length > 0)
      .slice(0, 10); // Limit results

    return Response.json({ 
      query,
      resultCount: results.length,
      results
    });
  }
};
```


## Performance Tips

### 1. Use Cache API

```javascript
const cache = caches.default;
const cacheKey = new Request(`https://cache.example.com/${repo}`);
const cached = await cache.match(cacheKey);
if (cached) return cached;
```

### 2. Stream Large Responses

```javascript
const { readable, writable } = new TransformStream();
const writer = writable.getWriter();

ctx.waitUntil((async () => {
  const result = await fetch({ source: repoUrl });
  await writer.write(result.markdown);
  await writer.close();
})());

return new Response(readable);
```

### 3. Use Durable Objects for State

```javascript
const id = env.REPO_ANALYZER.idFromName(repoKey);
const analyzer = env.REPO_ANALYZER.get(id);
return analyzer.fetch(request);
```

## Environment Setup

### wrangler.toml

```toml
name = "codefetch-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"
# No nodejs_compat needed!

[vars]
MAX_FILE_SIZE = "1048576"  # 1MB

# Add GitHub token as secret
# wrangler secret put GITHUB_TOKEN
```

### TypeScript Configuration

```typescript
// worker-configuration.d.ts
interface Env {
  GITHUB_TOKEN: string;
  CACHE_DURATION: string;
  MAX_FILE_SIZE: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // Your worker code
  }
};
```

## Error Handling

```javascript
try {
  const result = await fetch({ source: repoUrl });
} catch (error) {
  if (error.message.includes('404')) {
    return new Response('Repository not found', { status: 404 });
  }
  if (error.message.includes('403')) {
    return new Response('Rate limit exceeded or auth required', { status: 403 });
  }
  if (error.message.includes('Invalid URL')) {
    return new Response('Invalid repository URL', { status: 400 });
  }
  // Log to Workers Analytics
  console.error('Fetch error:', error);
  return new Response('Internal error', { status: 500 });
}
```

## Limitations

1. **No File System** - All operations are in-memory
2. **Memory Limits** - Workers have 128MB memory limit
3. **CPU Time** - Maximum 30 seconds for free plan
4. **Subrequest Limits** - 50 subrequests per request
5. **Response Size** - 10MB response limit

## Testing Locally

```bash
# Install Wrangler
pnpm add -D wrangler

# Create worker file
echo 'import { fetch } from "codefetch-sdk/worker";
export default { 
  fetch: () => new Response("OK") 
};' > worker.js

# Test locally
wrangler dev worker.js
```

## Support

- 🐛 [Report Issues](https://github.com/regenrek/codefetch/issues)
- 📚 [Full Documentation](https://github.com/regenrek/codefetch)
- 💬 [Discussions](https://github.com/regenrek/codefetch/discussions) 