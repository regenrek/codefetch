# Changelog

## 2.0.0

### Added
- Integrated web-fetch functionality directly into CLI for better architecture
- Added 10-minute safety timeout for web operations
- Added cache statistics display with verbose level 2 or higher
- Added new web crawling options:
  - `--max-pages` - Maximum pages to crawl (default: 50)
  - `--max-depth` - Maximum crawl depth (default: 2)
  - `--ignore-robots` - Ignore robots.txt restrictions
  - `--ignore-cors` - Ignore CORS restrictions
- Exported `createCache` from SDK for cache management

### Changed
- Moved web-fetch functionality from SDK to CLI package
- Improved TypeScript types for cache strategy consistency
- Fixed git provider comparison to use correct values ("github.com" instead of "github")

### Fixed
- Fixed TypeScript compilation errors in cache implementation
- Fixed test expectations to match actual SDK behavior
- Removed unused WebCache export and related tests

### Removed
- Removed `packages/sdk/src/web/web-fetch.ts` (functionality moved to CLI)
- Removed WebCache test file as it's no longer part of public API

## 1.5.1

- Enhance argument parsing and file handling: add token-count-only option, improve glob path handling, and update tests for new functionality. (49fcbbf)
- Update tracked models in config files to match new model database (93c8882)
- Update model database to only include o3, gemini-2.5-pro, claude-sonnet-4, and claude-opus-4 (ce3f082) 