# Changelog

## 2.2.0

### Added
- **XML-structured output format** - Output now uses semantic XML tags for better AI parsing:
  - `<task>...</task>` - Wraps the prompt/instructions
  - `<filetree>...</filetree>` - Wraps the project tree structure
  - `<source_code>...</source_code>` - Wraps all source code files
- **Additive `--include-dir` and `--include-files`** - These options now work together additively instead of being mutually exclusive. Use both to include specific directories PLUS specific files.
- **External prompt file support** - Prompt files with paths (e.g., `-p docs/arch/prompt.md`) are now correctly resolved from the project root instead of requiring them to be in `codefetch/prompts/`

### Fixed
- Fixed `--include-dir` and `--include-files` being mutually exclusive - now they combine additively
- Fixed external prompt file paths not being found when containing directory separators
- Fixed prompts without `{{CURRENT_CODEBASE}}` placeholder not including the codebase content

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
- Added default ignore patterns for AI agent tools:
  - `.cursor/.agent-tools` - Cursor AI agent tools directory
  - `.ckignore` - CodeKit ignore file
  - `.spezi` - Spezi configuration directory
- Added default ignore patterns for Rust projects:
  - `Cargo.lock` - Rust package lock file
  - `target/` - Rust build output directory
- Added default ignore patterns for Go projects:
  - `go.sum` - Go module checksums
  - `vendor/` - Go vendor directory

### Fixed
- Fixed ignore patterns containing slashes (e.g., `.cursor/.agent-tools`) not being respected in `.codefetchignore` and `.gitignore`
  - Normalized file paths to use forward slashes for cross-platform compatibility with the ignore library

## 2.0.3

### Changed
- `--project-tree` now respects `.gitignore`, `.codefetchignore`, and config filters by default
  - Project tree output now only shows files that would be included in the codebase analysis
  - This ensures consistency between the tree structure and the actual files processed
  - Added new `--project-tree-skip-ignore-files` flag to restore previous behavior (showing all files including ignored ones)
- **BREAKING**: Line numbers are now disabled by default to save tokens
  - Use `--enable-line-numbers` to enable line numbers in output
  - Replaced `--disable-line-numbers` flag with `--enable-line-numbers`
  - Config option `disableLineNumbers` now defaults to `true`
- **BREAKING**: `--prompt` / `-p` now supports inline prompt strings
  - Can now use `-p "Review this code for security issues"` directly
  - Still supports built-in prompts (fix, improve, codegen, testgen) and file paths (.md/.txt)

### Added
- Added `--project-tree-skip-ignore-files` flag to include ignored files in project tree output
  - Useful when you want to see the full directory structure even for files excluded by ignore patterns
  - When enabled, the tree will show all files regardless of `.gitignore`, `.codefetchignore`, or config filters
- Added inline prompt support for `--prompt` / `-p` flag
  - Use `-p "Your prompt text here"` to add a custom prompt directly from command line
  - Inline prompts are automatically wrapped with `{{CURRENT_CODEBASE}}` placeholder
- Added `--enable-line-numbers` flag to enable line numbers in output (disabled by default)

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