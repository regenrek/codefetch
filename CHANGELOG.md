# Changelog

## 2.0.4

### Changed
- `--project-tree` now respects `.gitignore`, `.codefetchignore`, and config filters by default
  - Project tree output now only shows files that would be included in the codebase analysis
  - This ensures consistency between the tree structure and the actual files processed
  - Added new `--project-tree-skip-ignore-files` flag to restore previous behavior (showing all files including ignored ones)

### Added
- Added `--project-tree-skip-ignore-files` flag to include ignored files in project tree output
  - Useful when you want to see the full directory structure even for files excluded by ignore patterns
  - When enabled, the tree will show all files regardless of `.gitignore`, `.codefetchignore`, or config filters

## 2.0.3

### Fixed
- Fixed `--include-files` option not including specified files when using glob patterns or absolute paths
  - Resolved issue where absolute paths resolved from config weren't being converted to relative paths for fast-glob
  - Now correctly handles both specific file paths and glob patterns (e.g., `src/lib/llm/**/*`)
  - Also fixed `--include-dir`, `--exclude-dir`, and `--exclude-files` to properly handle absolute paths

## 2.0.2

### Added
- Added `--no-summary` flag to disable the token/model summary box at the end of output
- Updated config types in SDK to support `noSummary` option

## 2.0.1

### Fixed
- Fixed tokenizer error handling to gracefully fall back to simple estimation when network or remote tokenizer fetch fails (cl100k, o200k, p50k encoders)
- Improved error messages with warnings when falling back to simple tokenizer
- Added browser and worker build directories to .gitignore

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