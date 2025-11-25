# Changelog

## Current Version

### Changed
- `generateProjectTree` and `generateMarkdown` now respect ignore files by default
  - Added new `generateProjectTreeFromFiles` function that builds tree from filtered file list
  - Project tree now only shows files that would be included in codebase analysis
  - Added `projectTreeSkipIgnoreFiles` option to `MarkdownGeneratorOptions` to restore previous behavior
- **BREAKING**: `disableLineNumbers` now defaults to `true` to save tokens
  - Line numbers in code output are now disabled by default
  - Set `disableLineNumbers: false` to enable line numbers

### Added
- Added `generateProjectTreeFromFiles` function to generate project tree from a filtered file list
  - Ensures tree structure matches the actual files being processed
  - Respects all ignore patterns (`.gitignore`, `.codefetchignore`, config filters)
- Added `projectTreeSkipIgnoreFiles` option to `MarkdownGeneratorOptions` interface
  - When `true`, uses original `generateProjectTree` behavior (shows all files)
  - When `false` (default), uses `generateProjectTreeFromFiles` (respects ignore patterns)
- Added `inlinePrompt` option to `MarkdownGeneratorOptions` interface
  - Allows passing a prompt string directly instead of a file path
  - Inline prompts are automatically wrapped with `{{CURRENT_CODEBASE}}` placeholder

### Fixed
- Fixed file inclusion/exclusion patterns not working correctly with absolute paths
  - Convert absolute paths to relative paths relative to `baseDir` before passing to fast-glob
  - Ensures `includeFiles`, `includeDirs`, `excludeDirs`, and `excludeFiles` work correctly with both relative and absolute paths
  - Fixes issue where glob patterns like `src/lib/llm/**/*` weren't matching files when resolved to absolute paths

### Major Changes

- **Cache System Overhaul**: Complete rewrite of the caching system to fix Cloudflare Workers compatibility
  - Fixed "Invalid URL" errors when using cache in Cloudflare Workers
  - Implemented environment-aware cache factory (CloudflareCache, FileSystemCache, MemoryCache)
  - Added proper URL generation for Cloudflare Cache API compliance
  - Added cache control options: `noCache`, `cache` strategies, `cacheBaseUrl`, `cacheTTL`
  - Implemented content validation and automatic cleanup of invalid entries
  - Graceful degradation when cache initialization fails
  - For immediate fix use `{ noCache: true }` or configure `{ cacheBaseUrl: 'https://your-domain.com' }`

- Renamed `streamGitHubTarball` to `fetchGitHubTarball` for clarity
  - The function still returns a streaming response but the name better reflects its purpose
  - Update imports: `import { fetchGitHubTarball } from 'codefetch-sdk/web'`

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

 