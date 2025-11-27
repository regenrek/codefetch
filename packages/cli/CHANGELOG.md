# Changelog

## 2.2.0

### Added
- **XML-structured output format** - Output now uses semantic XML tags for better AI parsing:
  - `<task>...</task>` - Wraps the prompt/instructions
  - `<filetree>...</filetree>` - Wraps the project tree structure
  - `<source_code>...</source_code>` - Wraps all source code files
- **External prompt file support** - Prompt files with paths (e.g., `-p docs/arch/prompt.md`) are now correctly resolved from the project root

### Fixed
- Fixed `getPromptFile` not resolving external file paths correctly when they contain directory separators

## 2.1.2

### Fixed
- Fixed URL format in `codefetch open` command:
  - Model format corrected from `gpt-5.1-pro` to `gpt-5-1-pro` (dashes instead of dots)
  - URL now generated without `https://` prefix (as `chatgpt.com/?model=...`)
  - Prompt parameter now included as URL-encoded query parameter
  - Default prompt text updated to "Your codebase is in your clipboard just paste it and remove this line"

## 2.1.0

### Added
- Added `codefetch open` subcommand that generates codebase, copies to clipboard, and opens AI chat in browser
  - Default opens ChatGPT with gpt-5.1-pro model
  - Configurable via `--chat-url`, `--chat-model`, and `--chat-prompt` options
  - Supports all standard codefetch options (e.g., `-e`, `-t`, `--exclude-dir`)
  - Use `--no-browser` to skip browser opening and just copy to clipboard
- Added `--copy` flag to copy output to clipboard (works on macOS, Windows, and Linux)
  - Cross-platform clipboard support using native OS utilities
  - Useful for quickly sharing codebase output

## 2.0.4

### Added
- Added `--exclude-markdown` flag to exclude markdown files (*.md, *.markdown, *.mdx) from output
  - Useful when you want to analyze code without documentation files

### Fixed
- Fixed ignore patterns containing slashes (e.g., `.cursor/.agent-tools`) not being respected
  - Normalized file paths for cross-platform compatibility

## 2.0.3

### Changed
- `--project-tree` now respects `.gitignore`, `.codefetchignore`, and config filters by default
  - Project tree output now only shows files that would be included in the codebase analysis
  - This ensures consistency between the tree structure and the actual files processed
- **BREAKING**: Line numbers are now disabled by default to save tokens
  - Use `--enable-line-numbers` to enable line numbers in output
  - Replaced `--disable-line-numbers` flag with `--enable-line-numbers`
- **BREAKING**: `--prompt` / `-p` now supports inline prompt strings
  - Can now use `-p "Review this code for security issues"` directly
  - Still supports built-in prompts (fix, improve, codegen, testgen) and file paths (.md/.txt)

### Added
- Added `--project-tree-skip-ignore-files` flag to include ignored files in project tree output
  - Useful when you want to see the full directory structure even for files excluded by ignore patterns
  - When enabled, the tree will show all files regardless of `.gitignore`, `.codefetchignore`, or config filters
- Added inline prompt support for `--prompt` / `-p` flag
  - Use `-p "Your prompt text here"` to add a custom prompt directly from command line
- Added `--enable-line-numbers` flag to enable line numbers in output (disabled by default)

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
