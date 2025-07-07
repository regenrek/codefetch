# @codefetch/sdk - Cloudflare Workers Guide

This guide shows how to use @codefetch/sdk in Cloudflare Workers to fetch and convert code repositories and websites to AI-friendly markdown.

## Prerequisites

- Node.js 18+ and npm
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- Cloudflare account (free tier works)

## Quick Start

### 1. Create a new Worker project

```bash
npm create cloudflare@latest my-codefetch-worker
# Choose "Hello World" Worker
# Choose TypeScript
# Choose Yes to deploy
```

### 2. Install @codefetch/sdk

```bash
cd my-codefetch-worker
npm install @codefetch/sdk
```

### 3. Configure wrangler.toml

```toml
name = "my-codefetch-worker"
main = "src/index.ts"
compatibility_date = "2025-07-07"
compatibility_flags = ["nodejs_compat"]  # Required!

# Optional: Add GitHub token for private repos
# [vars]
# GITHUB_TOKEN = "ghp_YOUR_TOKEN_HERE"

# Or use secrets (recommended)
# Run: wrangler secret put GITHUB_TOKEN
```

### 4. Create your Worker

```typescript
// src/index.ts
import { fetchFromWeb } from "@codefetch/sdk/worker";

export interface Env {
  GITHUB_TOKEN?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Extract URL from query parameter
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return new Response("Missing 'url' query parameter", { status: 400 });
    }
    
    try {
      // Fetch and convert to markdown
      const result = await fetchFromWeb(targetUrl, {
        // For websites
        maxPages: 20,
        maxDepth: 2,
        
        // For GitHub repos
        maxFiles: 100,
        extensions: [".ts", ".js", ".md"],
        githubToken: env.GITHUB_TOKEN, // For private repos
        
        // General options
        verbose: 1,
      });
      
      return new Response(result.markdown, {
        headers: { 
          "Content-Type": "text/markdown",
          "Cache-Control": "public, max-age=3600" 
        },
      });
    } catch (error) {
      console.error("Fetch error:", error);
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
```

### 5. Test locally

```bash
wrangler dev

# In another terminal:
curl "http://localhost:8787?url=https://github.com/microsoft/TypeScript"
curl "http://localhost:8787?url=https://docs.cloudflare.com"
```

### 6. Deploy to Cloudflare

```bash
wrangler deploy

# Your Worker will be available at:
# https://my-codefetch-worker.<your-subdomain>.workers.dev
```

## Advanced Usage

### Handling different source types

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === "/github") {
      const repo = url.searchParams.get("repo"); // e.g., "owner/name"
      if (!repo) {
        return new Response("Missing 'repo' parameter", { status: 400 });
      }
      
      const result = await fetchFromWeb(`https://github.com/${repo}`, {
        maxFiles: 50,
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        excludeDirs: ["node_modules", "dist", "build"],
        githubToken: env.GITHUB_TOKEN,
      });
      
      return new Response(result.markdown, {
        headers: { "Content-Type": "text/markdown" },
      });
    }
    
    if (url.pathname === "/website") {
      const site = url.searchParams.get("url");
      if (!site) {
        return new Response("Missing 'url' parameter", { status: 400 });
      }
      
      const result = await fetchFromWeb(site, {
        maxPages: 10,
        maxDepth: 1,
        includeMetadata: true,
      });
      
      return new Response(result.markdown, {
        headers: { "Content-Type": "text/markdown" },
      });
    }
    
    return new Response("Use /github?repo=owner/name or /website?url=...", {
      status: 200,
    });
  },
} satisfies ExportedHandler<Env>;
```

### Token counting

```typescript
import { fetchFromWeb, countTokens } from "@codefetch/sdk/worker";

const result = await fetchFromWeb(targetUrl, { maxFiles: 50 });
const tokens = await countTokens(result.markdown, "cl100k");

return new Response(JSON.stringify({
  markdown: result.markdown,
  tokens: tokens,
  estimatedCost: (tokens / 1000) * 0.03, // Example pricing
}), {
  headers: { "Content-Type": "application/json" },
});
```

### Using with AI APIs

```typescript
import { fetchFromWeb } from "@codefetch/sdk/worker";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Fetch code/docs
    const result = await fetchFromWeb("https://github.com/example/repo", {
      maxFiles: 30,
      extensions: [".ts", ".md"],
    });
    
    // Send to OpenAI API (example)
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a code analyzer. Analyze this codebase."
          },
          {
            role: "user",
            content: result.markdown
          }
        ],
      }),
    });
    
    return openaiResponse;
  },
} satisfies ExportedHandler<Env>;
```

## Environment Variables

Add secrets using Wrangler:

```bash
# For GitHub private repos
wrangler secret put GITHUB_TOKEN

# For AI APIs
wrangler secret put OPENAI_API_KEY
```

## Limitations

1. **No local file access** - Can only fetch from URLs
2. **10MB storage limit** - Large repos may fail
3. **No git clone** - Uses GitHub ZIP API only
4. **Content-Length required** - Fails if size unknown
5. **50ms CPU limit** (free) / **30s limit** (paid)

## Tips & Best Practices

1. **Cache responses** - Use Cache API or set cache headers
2. **Filter aggressively** - Use `extensions` and `excludeDirs` to reduce size
3. **Handle timeouts** - Workers have CPU time limits
4. **Use GitHub tokens** - Increases rate limits from 60 to 5000/hour
5. **Monitor usage** - Check your Workers analytics

## Error Handling

Common errors and solutions:

```typescript
try {
  const result = await fetchFromWeb(url, options);
} catch (error) {
  if (error.message.includes("exceeds Worker storage limit")) {
    // Repository too large
    return new Response("Repository too large. Try filtering files.", { 
      status: 413 
    });
  }
  
  if (error.message.includes("Content-Length header")) {
    // GitHub didn't provide size
    return new Response("Cannot determine repository size", { 
      status: 400 
    });
  }
  
  if (error.message.includes("git clone is not supported")) {
    // Tried to use git URL without GitHub
    return new Response("Only GitHub URLs supported in Workers", { 
      status: 400 
    });
  }
  
  // Generic error
  return new Response(`Error: ${error.message}`, { status: 500 });
}
```

## Example Responses

### Fetch TypeScript repo docs
```bash
curl "https://your-worker.workers.dev?url=https://github.com/microsoft/TypeScript&extensions=.md,.ts&maxFiles=20"
```

### Fetch website documentation
```bash
curl "https://your-worker.workers.dev?url=https://docs.example.com&maxPages=10&maxDepth=2"
```

## Debugging

Enable verbose logging:

```typescript
const result = await fetchFromWeb(url, {
  verbose: 2, // 0 = silent, 1 = info, 2 = debug
});
```

Check logs:
```bash
wrangler tail
```

## Support

- [GitHub Issues](https://github.com/codefetch-ai/codefetch/issues)
- [Cloudflare Workers Discord](https://discord.cloudflare.com)
- [Documentation](https://github.com/codefetch-ai/codefetch)

## License

MIT - See LICENSE file in the repository