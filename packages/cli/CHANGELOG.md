# Changelog

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
