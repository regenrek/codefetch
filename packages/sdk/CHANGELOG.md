# Changelog

## 2.0.0

### Major Changes

- **Cache System Overhaul**: Complete rewrite of the caching system to fix Cloudflare Workers compatibility
  - Fixed "Invalid URL" errors when using cache in Cloudflare Workers
  - Implemented environment-aware cache factory (CloudflareCache, FileSystemCache, MemoryCache)
  - Added proper URL generation for Cloudflare Cache API compliance
  - Added cache control options: `noCache`, `cache` strategies, `cacheBaseUrl`, `cacheTTL`
  - Implemented content validation and automatic cleanup of invalid entries
  - Graceful degradation when cache initialization fails
  - **Migration**: For immediate fix use `{ noCache: true }` or configure `{ cacheBaseUrl: 'https://your-domain.com' }`

- **Breaking**: Renamed `streamGitHubTarball` to `fetchGitHubTarball` for clarity
  - The function still returns a streaming response but the name better reflects its purpose
  - Update imports: `import { fetchGitHubTarball } from '@codefetch/sdk/web'`

### Features

- **Testing Infrastructure**: Integrate Mock Service Worker (MSW) for improved testing
  - Add MSW for mocking network requests during tests
  - Mock tiktoken tokenizer endpoints to prevent network calls during testing
  - Pre-download tokenizer fixtures (`p50k_base.json`, `o200k_base.json`, `cl100k_base.json`)
  - Configure global test setup with MSW server
  - Significantly improved test reliability and speed

- **Markdown Streaming**: Add streaming functionality for markdown generation
  - New `createMarkdownStream` function for streaming markdown content generation
  - Efficient memory usage for large codebases
  - Real-time markdown generation as files are processed

- **Cloudflare Worker Enhancements**: 
  - Add comprehensive Worker-specific TypeScript types
  - Introduce performance metrics tracking
  - Optimize bundle size and improve Worker compatibility
  - Enhanced error handling for Worker environments

### Improvements

- Fix TypeScript strict mode compliance issues
- Update test infrastructure to use Vitest's new mocking syntax
- Add proper cleanup for MSW server in test teardown
- Fix ESLint issues with unused catch variables
- Improve error messages and debugging information

### Developer Experience

- Add comprehensive test fixtures for offline testing
- Improve test isolation and reliability
- Better TypeScript type safety throughout the codebase
- Enhanced documentation for Worker-specific features

### Dependencies

- Add `msw` as development dependency for test mocking
- Update testing infrastructure to support offline testing

## 1.6.3

- Optimize Worker bundle size and remove redundant implementations
  - Remove redundant `github-tarball-worker.ts` implementation
  - Remove `tar-stream` dependency saving ~24KB in bundle size
  - Worker bundle reduced from 39.3KB to 35.4KB (~10% reduction)
  - Use existing optimized `streamGitHubTarball` that already uses DecompressionStream
- Fix TypeScript type issues in github-tarball.ts
- Update documentation to reflect the optimized implementation

## 1.6.2

- Add Cloudflare Worker support with worker-safe implementations (#cloudflare-support)
  - New `/worker` entry point for Cloudflare Worker environments
  - Worker-compatible cache implementation using Cache API instead of file system
  - In-memory GitHub repository fetching without file system operations
  - Automatic environment detection to use appropriate implementations
  - Browser build now exports `fetch` function for web usage
- Maintain full backward compatibility - CLI continues to work without changes
- Add `fetchFromWeb` as Worker-safe alternative to file-based operations
- Support for fetching private GitHub repositories with token authentication in Workers
- Add proper TypeScript types for Worker environments
- Optimized GitHub tarball extraction already uses native DecompressionStream
  - Zero bundle overhead - no external dependencies
  - Custom lightweight TAR parser (~100 lines)
  - Native Web Streams throughout - no Node.js stream conversion needed
  - `streamGitHubTarball` function available in worker exports

## 1.5.1

- Enhance argument parsing and file handling: add token-count-only option, improve glob path handling, and update tests for new functionality. (49fcbbf)
- Update tracked models in config files to match new model database (93c8882)
- Update model database to only include o3, gemini-2.5-pro, claude-sonnet-4, and claude-opus-4 (ce3f082) 