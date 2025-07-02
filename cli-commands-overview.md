# Codefetch CLI Commands Overview

## Summary

Codefetch is a powerful CLI tool that converts codebases and websites into AI-friendly documentation. The current branch represents a major evolution from the main branch, introducing:

- **Monorepo architecture** with separate CLI, SDK, and MCP packages
- **Web fetching capabilities** for analyzing remote repositories and websites
- **JSON output format** for structured data export
- **GitHub API integration** with authentication support
- **Enhanced configuration** with `.codefetchrc` and `.codefetchignore` files
- **Advanced token management** with multiple encoders and limiting strategies

## Available Commands

### 1. **Default Command** (no subcommand)
The main command that analyzes a codebase and generates documentation.

```bash
npx codefetch [options]
```

### 2. **Init Command**
Initialize a new codefetch project with configuration files.

```bash
npx codefetch init [options]
```

Options:
- `-d, --default` - Use default setup without prompts

## Command Options

### Basic Options
- `-o, --output <file>` - Specify output filename (defaults to codebase.md)
- `--dir <path>` - Specify the directory to scan (defaults to current directory)
- `-h, --help` - Display help message
- `-v, --verbose [level]` - Show processing information (0=none, 1=basic, 2=debug)

### File Filtering Options
- `-e, --extension <ext,...>` - Filter by file extensions (e.g., .ts,.js)
- `--include-files <p,...>` - Include specific files (supports patterns like *.ts)
- `--exclude-files <p,...>` - Exclude specific files (supports patterns like *.test.ts)
- `--include-dir <dir,...>` - Include specific directories
- `--exclude-dir <dir,...>` - Exclude specific directories

### Token Management Options
- `--max-tokens <number>` - Limit output tokens (default: 500,000)
- `--token-encoder <type>` - Token encoding method:
  - `simple` - Basic character-based estimation (fastest)
  - `p50k` - GPT-3 tokenizer
  - `o200k` - GPT-4o tokenizer
  - `cl100k` - GPT-4 tokenizer (default)
- `--token-limiter <type>` - Token limiting strategy:
  - `truncated` - Cut off when limit reached (default)
  - `sequential` - Include files sequentially until limit
- `-c, --token-count-only` - Only output the token count
- `--tracked-models <models>` - Show token counts for specific AI models

### Output Format Options
- `--format <type>` - Output format (markdown, json) (default: markdown)
- `-t, --project-tree [depth]` - Generate visual project tree (optional depth, default: 2)
- `--disable-line-numbers` - Disable line numbers in output
- `-d, --dry-run` - Output to console instead of file

### Prompt Options
- `-p, --prompt <type>` - Add a default prompt:
  - `fix` - Fix issues prompt
  - `improve` - Improvement suggestions prompt
  - `codegen` - Code generation prompt
  - `testgen` - Test generation prompt
  - Or provide a custom prompt file with .md/.txt extension
- `--var <key=value>` - Set template variables for prompts

### Web Fetching Options (New Features)
- `--url <URL>` - Fetch and analyze content from a URL (website or git repository)
- `--no-cache` - Skip cache and fetch fresh content
- `--cache-ttl <hours>` - Cache time-to-live in hours (default: 1)
- `--max-depth <n>` - Maximum crawl depth for websites (default: no limit)
- `--max-pages <n>` - Maximum pages to crawl (default: no limit)
- `--branch <name>` - Git branch/tag/commit to fetch (for git repositories)
- `--ignore-robots` - Ignore robots.txt when crawling websites
- `--ignore-cors` - Ignore CORS restrictions (CLI-only feature)
- `--no-api` - Disable GitHub API and use git clone instead
- `--github-token <token>` - GitHub API token for private repos (or set GITHUB_TOKEN env var)

## Usage Examples

### Basic Usage
```bash
# Analyze current directory
npx codefetch

# Analyze specific directory
npx codefetch --dir ./src

# Custom output file
npx codefetch -o analysis.md
```

### Filtering Examples
```bash
# Only TypeScript files
npx codefetch -e .ts,.tsx

# Exclude test files
npx codefetch --exclude-files "*.test.ts,*.spec.ts"

# Include specific directories
npx codefetch --include-dir src,lib --exclude-dir node_modules,dist
```

### Web Fetching Examples
```bash
# Analyze a GitHub repository (uses API by default)
npx codefetch --url https://github.com/user/repo --branch main

# Fetch private GitHub repo with token
npx codefetch --url https://github.com/org/private-repo --github-token ghp_xxxxx

# Force git clone instead of API
npx codefetch --url https://github.com/user/repo --no-api

# Analyze a website
npx codefetch --url https://docs.example.com --max-depth 3 --max-pages 50
```

### Prompt Examples
```bash
# Use built-in fix prompt
npx codefetch -p fix "Fix the authentication issue"

# Use custom prompt file
npx codefetch -p ./prompts/custom-review.md

# Pass custom variables
npx codefetch -p improve --var message="Optimize performance" --var focus="database queries"
```

### Output Format Examples
```bash
# Generate JSON format
npx codefetch --format json -o codebase.json

# Generate with project tree visualization
npx codefetch -t 5

# Dry run to preview output
npx codefetch -d

# Only output token count
npx codefetch -c
```

## Configuration Files

### .codefetchrc Configuration
Create a `.codefetchrc` file for project-specific settings:

```json
{
  "extensions": [".ts", ".tsx", ".js", ".jsx"],
  "excludeFiles": ["*.test.ts", "*.spec.js"],
  "excludeDirs": ["__tests__", "coverage"],
  "maxTokens": 100000,
  "outputFile": "codebase.md",
  "outputPath": "./docs",
  "tokenEncoder": "cl100k",
  "projectTree": 2,
  "tokenLimiter": "truncated",
  "format": "markdown"
}
```

### .codefetchignore File
Create a `.codefetchignore` file to exclude files and directories:

```
# Dependencies
node_modules/
vendor/

# Build outputs
dist/
build/
*.min.js

# Test files
*.test.ts
*.spec.js
__tests__/

# Environment files
.env*
*.log
```

## Major Changes from Main Branch

Based on the git diff, this branch introduces significant enhancements:

### 1. **Monorepo Refactoring**
- Project restructured into a monorepo with three packages:
  - `@codefetch/cli` - The CLI tool
  - `@codefetch/sdk` - Core SDK functionality
  - `@codefetch/mcp` - MCP (Model Context Protocol) server

### 2. **New Features**
- **JSON Output Format**: Added support for structured JSON output in addition to markdown
- **Web Fetching**: Complete implementation of web content fetching:
  - GitHub repository analysis via API or git clone
  - Website crawling with depth and page limits
  - Caching system for fetched content
  - HTML to Markdown conversion
- **GitHub API Integration**: Native support for GitHub repositories with authentication
- **Enhanced Token Management**: Multiple token encoders and limiting strategies
- **Template Variables**: Support for custom variables in prompts

### 3. **Architecture Improvements**
- Separated CLI logic from core SDK functionality
- Added comprehensive test coverage with unit and integration tests
- Introduced TypeScript configurations per package
- Enhanced build system with unbuild

### 4. **New Playground Scripts**
- `analyze-github-repo.js` - GitHub repository analysis
- `code-analyzer.js` - Code analysis utilities
- `generate-docs.js` - Documentation generation
- `test-web-fetch.js` - Web fetching tests

### 5. **Configuration Enhancements**
- New `codefetch.config.mjs` configuration file
- Support for `.codefetchignore` files
- Enhanced ESLint and Prettier configurations

The current branch represents a major evolution of the codefetch tool, transforming it from a simple codebase analyzer into a comprehensive code fetching and analysis platform with support for remote repositories and websites.