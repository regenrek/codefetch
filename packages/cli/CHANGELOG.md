# Changelog

## 2.0.2

### Changed
- `--project-tree` now respects `.gitignore`, `.codefetchignore`, and config filters by default
  - Project tree output now only shows files that would be included in the codebase analysis
  - This ensures consistency between the tree structure and the actual files processed

### Added
- Added `--project-tree-skip-ignore-files` flag to include ignored files in project tree output
  - Useful when you want to see the full directory structure even for files excluded by ignore patterns
  - When enabled, the tree will show all files regardless of `.gitignore`, `.codefetchignore`, or config filters

## 2.0.1

### Fixed
- Fixed `--include-files` option not including specified files correctly
  - Resolved issue where file patterns with globs (e.g., `src/lib/llm/**/*`) weren't matching files
  - Fixed handling of absolute paths in include/exclude options

## 2.0.0

### Added
- Integrated web-fetch functionality directly from SDK
- Added 10-minute safety timeout for web operations  
- Added cache statistics display with verbose level 2 or higher
- Added new web crawling options:
  - `--max-pages` - Maximum pages to crawl (default: 50)
  - `--max-depth` - Maximum crawl depth (default: 2)
  - `--ignore-robots` - Ignore robots.txt restrictions
  - `--ignore-cors` - Ignore CORS restrictions
- Support for web-specific options in default command

### Changed
- Web fetching now handled directly in CLI's default command
- Improved help text organization with separate sections for Git and Web options

### Fixed
- Fixed url-handler tests to match SDK's actual parseURL behavior
- Removed unused detectGitProvider import from tests

### Removed
- Removed WebCache test as it's no longer exported from SDK
