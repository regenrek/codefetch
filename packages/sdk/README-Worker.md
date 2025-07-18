# Codefetch SDK for Cloudflare Workers

The `codefetch-sdk` provides a specialized `/worker` export optimized for Cloudflare Workers environments, with zero file system dependencies and native Web Streams support.

## Installation

```bash
npm install codefetch-sdk
# or
pnpm add codefetch-sdk
# or
yarn add codefetch-sdk
```

## Worker-Specific Import

```javascript
// Use the /worker export for Cloudflare Workers
import { 
  streamGitHubTarball,
  fetchFromWeb,
  generateMarkdownFromContent,
  htmlToMarkdown,
  countTokens
} from 'codefetch-sdk/worker';
```

## Key Features

- 🚀 **Zero nodejs_compat required** - Uses native Web APIs
- 📦 **35.4KB bundle size** - Optimized for edge performance  
- 🌊 **Native streaming** - Memory-efficient processing
- 🔒 **Private repo support** - GitHub token authentication
- 🎯 **Smart filtering** - Extension and directory filters

## API Reference

### `streamGitHubTarball()`

Extract files from GitHub repositories using native DecompressionStream.

```typescript
async function streamGitHubTarball(
  owner: string,
  repo: string,
  ref?: string,
  options?: {
    token?: string;           // GitHub token for private repos
    extensions?: string[];    // Filter by file extensions
    excludeDirs?: string[];   // Directories to exclude
    maxFiles?: number;        // Limit number of files
    onProgress?: (count: number) => void;
  }
): Promise<FileContent[]>
```

#### Example: Basic Usage

```javascript
export default {
  async fetch(request) {
    const files = await streamGitHubTarball('facebook', 'react', 'main', {
      extensions: ['.js', '.ts', '.md'],
      excludeDirs: ['node_modules', '.git'],
      maxFiles: 100
    });

    return Response.json({
      fileCount: files.length,
      files: files.map(f => ({
        path: f.path,
        size: f.content.length
      }))
    });
  }
};
```

#### Example: Private Repository

```javascript
export default {
  async fetch(request, env) {
    const files = await streamGitHubTarball('myorg', 'private-repo', 'main', {
      token: env.GITHUB_TOKEN,  // Store in Workers secrets
      extensions: ['.ts', '.tsx']
    });

    // Process files...
    return new Response('OK');
  }
};
```

### `fetchFromWeb()`

Fetch and process web content (GitHub repos, URLs, local files in memory).

```typescript
async function fetchFromWeb(
  source: string,
  options?: FetchOptions
): Promise<FetchResult>
```

#### Example: Multi-Source Fetching

```javascript
export default {
  async fetch(request) {
    // Supports multiple sources
    const sources = [
      'https://github.com/sindresorhus/got',
      'https://raw.githubusercontent.com/user/repo/main/README.md',
      'https://example.com/api/docs'
    ];

    const results = await Promise.all(
      sources.map(url => fetchFromWeb(url, {
        maxTokens: 50000,
        extensions: ['.ts', '.js', '.md']
      }))
    );

    return Response.json({
      sources: results.map(r => ({
        url: r.metadata.sourceUrl,
        files: r.files.length,
        tokens: r.metadata.totalTokens
      }))
    });
  }
};
```

### `generateMarkdownFromContent()`

Generate formatted markdown from in-memory file content.

```typescript
function generateMarkdownFromContent(
  files: FileContent[],
  options?: MarkdownFromContentOptions
): Promise<string>
```

#### Example: API Documentation Generator

```javascript
export default {
  async fetch(request) {
    // Fetch repository files
    const files = await streamGitHubTarball('expressjs', 'express', 'master', {
      extensions: ['.js', '.md'],
      excludeDirs: ['test', 'examples']
    });

    // Generate documentation
    const markdown = await generateMarkdownFromContent(files, {
      projectName: 'Express.js API',
      includeTreeStructure: true,
      contentOnly: false
    });

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
};
```

### `htmlToMarkdown()`

Convert HTML content to clean Markdown.

```javascript
export default {
  async fetch(request) {
    const html = await fetch('https://example.com/docs').then(r => r.text());
    const markdown = htmlToMarkdown(html);
    
    return new Response(markdown, {
      headers: { 'Content-Type': 'text/markdown' }
    });
  }
};
```

### `countTokens()`

Count tokens for LLM context management.

```javascript
const content = "Your content here...";
const tokenCount = countTokens(content, 'cl100k'); // OpenAI encoding

if (tokenCount > 100000) {
  // Handle large content
}
```

## Real-World Use Cases

### 1. GitHub Repository Analyzer

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
      const files = await streamGitHubTarball(owner, name, 'main', {
        extensions: ['.js', '.ts', '.py', '.go'],
        excludeDirs: ['node_modules', 'vendor', '.git'],
        token: env.GITHUB_TOKEN
      });

      // Analyze code
      const analysis = {
        totalFiles: files.length,
        languages: {},
        totalSize: 0,
        largestFiles: []
      };

      for (const file of files) {
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

### 2. Documentation API

```javascript
import { 
  streamGitHubTarball, 
  generateMarkdownFromContent,
  countTokens 
} from 'codefetch-sdk/worker';

export default {
  async fetch(request, env) {
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get('repo');
    const maxTokens = parseInt(searchParams.get('maxTokens') || '50000');

    // Fetch documentation files
    const files = await streamGitHubTarball(...repo.split('/'), 'main', {
      extensions: ['.md', '.mdx'],
      excludeDirs: ['node_modules']
    });

    // Generate formatted documentation
    let markdown = await generateMarkdownFromContent(files, {
      includeTreeStructure: true
    });

    // Ensure it fits within token limits
    const tokens = countTokens(markdown);
    if (tokens > maxTokens) {
      // Truncate or summarize
      markdown = markdown.slice(0, maxTokens * 4); // rough estimate
    }

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown',
        'X-Token-Count': tokens.toString()
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
    
    const files = await streamGitHubTarball(...repo.split('/'), 'main', {
      extensions: ['.js', '.ts', '.jsx', '.tsx']
    });

    const results = files
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
      .filter(result => result.matches.length > 0);

    return Response.json({ 
      query,
      resultCount: results.length,
      results: results.slice(0, 10) // Limit results
    });
  }
};
```

## Performance Tips

### 1. Use Cache API

```javascript
const cache = caches.default;
const cacheKey = new Request(url);
const cached = await cache.match(cacheKey);
if (cached) return cached;
```

### 2. Stream Large Responses

```javascript
const { readable, writable } = new TransformStream();
const writer = writable.getWriter();

// Stream results as they process
ctx.waitUntil((async () => {
  for await (const chunk of processLargeData()) {
    await writer.write(chunk);
  }
  await writer.close();
})());

return new Response(readable);
```

### 3. Use Durable Objects for State

```javascript
// Store analysis results in Durable Objects
const id = env.REPO_ANALYZER.idFromName(repoKey);
const analyzer = env.REPO_ANALYZER.get(id);
return analyzer.fetch(request);
```

## Limitations

1. **No File System** - All operations are in-memory
2. **Memory Limits** - Workers have 128MB memory limit
3. **CPU Time** - Maximum 30 seconds for free plan
4. **Subrequest Limits** - 50 subrequests per request

## Environment Setup

### wrangler.toml

```toml
name = "codefetch-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

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
  const files = await streamGitHubTarball(owner, repo);
} catch (error) {
  if (error.message.includes('404')) {
    return new Response('Repository not found', { status: 404 });
  }
  if (error.message.includes('403')) {
    return new Response('Rate limit exceeded or auth required', { status: 403 });
  }
  // Log to Workers Analytics
  console.error('GitHub fetch error:', error);
  return new Response('Internal error', { status: 500 });
}
```

## Testing Locally

```bash
# Install Wrangler
pnpm add -D wrangler

# Create worker file
echo 'import { streamGitHubTarball } from "codefetch-sdk/worker";
export default { 
  fetch: () => new Response("OK") 
};' > worker.js

# Test locally
wrangler dev worker.js
```

## Migration from Node.js

If migrating from the Node.js version:

```javascript
// Before (Node.js)
import { collectFiles, generateMarkdown } from 'codefetch-sdk';
const files = await collectFiles('./src');
const markdown = await generateMarkdown(files);

// After (Workers)
import { streamGitHubTarball, generateMarkdownFromContent } from 'codefetch-sdk/worker';
const files = await streamGitHubTarball('owner', 'repo');
const markdown = await generateMarkdownFromContent(files);
```

## Support

- 🐛 [Report Issues](https://github.com/regenrek/codefetch/issues)
- 📚 [Full Documentation](https://github.com/regenrek/codefetch)
- 💬 [Discussions](https://github.com/regenrek/codefetch/discussions) 