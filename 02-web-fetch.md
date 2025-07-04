# Web Fetch Implementation Plan for Codefetch

## Overview

This document outlines the plan to extend codefetch to support fetching and analyzing content from websites and git repositories through web URLs. The implementation will maintain consistency with the existing file-based approach while adding web-specific capabilities.

## Goals

1. Enable codefetch to analyze websites and web-based git repositories
2. Maintain the same output format and quality as local project analysis
3. Support common use cases: documentation sites, web apps, API docs, code examples
4. Provide a seamless experience without requiring authentication for public content

## Architecture Overview

```
codefetch --url <URL> [options]
         │
         ├─> URL Parser & Validator
         │   ├─> Git Provider Detector
         │   └─> Regular Website Handler
         │
         ├─> Content Fetcher
         │   ├─> Git Repository Fetcher (API/Clone)
         │   ├─> Website Crawler
         │   └─> Cache Manager
         │
         └─> Existing Pipeline
             ├─> Content Processor
             ├─> Token Counter
             └─> Markdown Generator
```

## Implementation Phases

### Phase 1: Core Infrastructure (Foundation)

#### 1.1 URL Handling Module (`packages/cli/src/web/url-handler.ts`)
- URL validation and sanitization
- Security checks (no local file://, no internal IPs)
- Git provider detection by patterns:
  ```typescript
  const gitProviders = {
    github: /^https:\/\/github\.com\/[\w-]+\/[\w-]+/,
    gitlab: /^https:\/\/gitlab\.com\/[\w-]+\/[\w-]+/,
    bitbucket: /^https:\/\/bitbucket\.org\/[\w-]+\/[\w-]+/,
  };
  ```

#### 1.2 Cache System (`packages/cli/src/web/cache.ts`)
- **Location Options**:
  1. **OS temp directory** (recommended): `os.tmpdir()/.codefetch-cache/`
  2. User home: `~/.codefetch/cache/`
  3. XDG cache dir: `$XDG_CACHE_HOME/codefetch/`
- Structure:
  ```
  cache/
  ├── websites/
  │   └── [domain-hash]/
  │       ├── metadata.json
  │       └── content/
  └── repos/
      └── [repo-hash]/
  ```
- Default TTL: **1 hour** (configurable)
- Auto-cleanup on startup if cache > 500MB

#### 1.3 Configuration Updates
- New CLI flags:
  - `--url <URL>`: Fetch from URL
  - `--no-cache`: Skip cache
  - `--cache-ttl <hours>`: Override default TTL
  - `--max-depth <n>`: Max crawl depth (default: no limit)
  - `--max-pages <n>`: Max pages to crawl (default: no limit)
  - `--branch <name>`: Git branch/tag/commit
  - `--ignore-robots`: Ignore robots.txt
  - `--ignore-cors`: Ignore CORS restrictions

### Phase 2: Website Fetching

#### 2.1 Website Crawler (`packages/cli/src/web/crawler.ts`)
- Respect robots.txt by default
- Follow same-domain links only
- Handle common web patterns:
  - Static HTML sites
  - Documentation sites (MkDocs, Docusaurus, etc.)
  - Code snippet extraction from `<pre>`, `<code>` blocks
  - Sitemap.xml parsing for better coverage

#### 2.2 Content Extractor (`packages/cli/src/web/extractor.ts`)
- Extract text content and code blocks
- Preserve URL structure as folder hierarchy:
  ```
  https://example.com/docs/api/users
  └─> example.com/
      └─> docs/
          └─> api/
              └─> users.html
  ```
- Special markers for web content:
  ```markdown
  <!-- SOURCE: https://example.com/docs/api/users -->
  <!-- FETCHED: 2024-01-15T10:30:00Z -->
  ```

#### 2.3 SPA Support (Progressive Enhancement)
- Phase 2a: Static HTML analysis with Cheerio
  - Fast, jQuery-like syntax for server-side DOM manipulation
  - Lightweight and efficient for basic HTML parsing
  
- Phase 2b: Progressive JavaScript rendering options
  - **Option 1**: happy-dom (2M weekly downloads, 7x faster than jsdom)
    - Import time: 45ms vs jsdom's 333ms
    - HTML parsing: 26ms vs jsdom's 256ms
    - Good ecosystem support
  - **Option 2**: linkedom (211K weekly downloads, ultra-lightweight)
    - Triple-linked list architecture for linear performance
    - Minimal memory usage, no stack overflow issues
    - Best for very large documents
  - **Option 3**: Make it pluggable - users can optionally install their preferred renderer
  - Start with Cheerio for static, add happy-dom as optional dependency for JS rendering

### Phase 3: Git Repository Support

#### 3.1 Git Provider Handler (`packages/cli/src/web/git-provider.ts`)
- **Decision: Use git clone approach** (simpler, unified interface)
  - All git providers support standard git protocol
  - No need for provider-specific API implementations
  - Avoids rate limiting issues
  - Consistent behavior across all git hosting services
  
#### 3.2 Repository Cloning Strategy
- Clone to temporary directory (like playground example)
- Shallow clone by default (`--depth 1`) for performance
- Support URL patterns:
  - `https://github.com/user/repo` (default branch)
  - `https://github.com/user/repo/tree/branch`
  - `https://github.com/user/repo/tree/commit-sha`
- Parse URL to extract:
  - Repository base URL
  - Branch/tag/commit reference
- Use existing file collection logic after cloning

### Phase 4: Advanced Features

#### 4.1 ~~Package Registry Support~~ (Removed from scope)
- Postponed to future version to reduce complexity

#### 4.2 API Documentation Support
- Detect and parse OpenAPI/Swagger specs
- Extract endpoint documentation
- Generate structured API overviews

#### 4.3 MCP Server Integration
- Real-time fetching capabilities
- Streaming updates for large crawls
- Progress reporting

#### 4.4 Multi-language Support
- Content language detection
- Appropriate code block language tags
- UTF-8 handling for international content

## Security Considerations

1. **URL Validation**
   - Blocked patterns: `file://`, `localhost`, `127.0.0.1`, `192.168.*`, `10.*`
   - Allowed protocols: `http://`, `https://`
   - DNS resolution checks

2. **Content Sanitization**
   - Strip script tags from HTML
   - Escape special characters in markdown
   - Validate file paths from URLs

3. **Resource Limits**
   - Default: No limits (user decides based on their needs)
   - Configurable limits via flags if needed
   - Request timeout: 30 seconds (configurable)
   - Concurrent requests: 5 (configurable)

4. **Robots.txt Compliance**
   - Cache robots.txt per domain
   - Default: respect crawl delays
   - Override with `--ignore-robots` flag

## Error Handling

1. **Network Errors**
   - Retry with exponential backoff
   - Clear error messages
   - Partial content handling

2. **Rate Limiting**
   - Detect 429 status codes
   - Implement backoff strategies
   - Show progress to user

3. **Content Issues**
   - Handle encoding problems
   - Skip binary files gracefully
   - Report parsing errors

## Testing Strategy

1. **Unit Tests**
   - URL parsing and validation
   - Cache operations
   - Content extraction

2. **Integration Tests**
   - Mock HTTP servers
   - Test various website structures
   - Git API response mocking

3. **E2E Tests**
   - Real website crawling (CI only)
   - Popular documentation sites
   - Public git repositories

## Performance Optimizations

1. **Concurrent Fetching**
   - Parallel requests with connection pooling
   - Queue management for large crawls
   - Progress indicators

2. **Smart Caching**
   - ETag support
   - Conditional requests
   - Partial content updates

3. **Memory Management**
   - Stream large files
   - Incremental processing
   - Garbage collection hints

## CLI Examples

```bash
# Analyze a documentation website
codefetch --url https://docs.example.com --max-depth 2

# Fetch a GitHub repository
codefetch --url https://github.com/user/repo --branch develop

# Analyze with specific options
codefetch --url https://example.com \
  --max-pages 50 \
  --no-cache \
  --output analysis.md

# Ignore robots.txt for specific use case
codefetch --url https://example.com --ignore-robots

# Analyze without limits
codefetch --url https://example.com

# Set specific limits if needed
codefetch --url https://example.com --max-depth 3 --max-pages 50
```

## Migration Path

1. **Backward Compatibility**
   - Existing commands work unchanged
   - New --url flag is optional
   - Same output format

2. **Gradual Rollout**
   - Feature flag for web fetching
   - Beta testing period
   - Documentation updates

## Open Questions & Decisions

1. **JavaScript Rendering**
   - Start with jsdom for lightweight JS support?
   - Make browser engines optional peer dependencies?
   - Provide clear documentation on when JS rendering is needed?

2. **Storage Limits**
   - Should cache have automatic cleanup?
   - User-configurable cache size?

3. **API Keys**
   - Support environment variables for API tokens?
   - Even for public repos to increase rate limits?

## Timeline Estimate

- Phase 1 (Core Infrastructure): 1 week
- Phase 2 (Website Fetching): 2 weeks  
- Phase 3 (Git Repository Support): 3-4 days (simplified with clone approach)
- Phase 4 (Advanced Features): 1-2 weeks
- Testing & Documentation: 1 week

Total: 5-6 weeks for full implementation

## Success Metrics

1. Successfully analyze popular documentation sites
2. Fetch and analyze public git repositories
3. Maintain performance parity with local analysis
4. Zero security vulnerabilities
5. Positive user feedback on web capabilities

## Next Steps

1. Review and approve this plan
2. Set up the web module structure
3. Implement URL validation and security checks
4. Build the crawler prototype
5. Integrate with existing pipeline