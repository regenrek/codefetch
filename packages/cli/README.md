# @codefetch/cli

Command-line interface for Codefetch - convert any codebase or website into AI-friendly markdown documentation.

## Installation

### Global Installation
```bash
npm install -g @codefetch/cli
# or
yarn global add @codefetch/cli
# or
pnpm add -g @codefetch/cli
```

### Local Installation
```bash
npm install --save-dev @codefetch/cli
# or
yarn add -D @codefetch/cli
# or
pnpm add -D @codefetch/cli
```

### Direct Usage (No Installation)
```bash
npx @codefetch/cli
```

## Quick Start

### Basic Usage

```bash
# Generate markdown from current directory
codefetch

# Generate from specific directory
codefetch /path/to/project

# Fetch from a website
codefetch --url https://example.com

# Fetch from a Git repository
codefetch --url https://github.com/user/repo
```

## Features

### Local Codebase Processing

Convert local codebases into structured markdown:

```bash
# Include only specific file types
codefetch -e ts,tsx,js,jsx

# Set token limit
codefetch --max-tokens 100000

# Output to specific file
codefetch -o my-codebase.md

# Dry run (output to console)
codefetch --dry-run
```

### Web Fetching

Fetch and convert websites or Git repositories:

```bash
# Fetch a website
codefetch --url macherjek.at --max-pages 50 --max-depth 3

# Analyze a GitHub repository (uses API by default - faster!)
codefetch --url https://github.com/facebook/react --branch main

# Fetch private GitHub repo with token
codefetch --url https://github.com/org/private-repo --github-token ghp_xxxxx
# Or set GITHUB_TOKEN environment variable
export GITHUB_TOKEN=ghp_xxxxx
codefetch --url https://github.com/org/private-repo

# Force git clone instead of API
codefetch --url https://github.com/user/repo --no-api

# Fetch without cache
codefetch --url example.com --no-cache

# Set cache TTL (hours)
codefetch --url example.com --cache-ttl 24
```

### Configuration

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
  "projectTree": 2
}
```

## Command Line Options

### General Options

- `-h, --help` - Show help information
- `-v, --verbose` - Increase verbosity (use multiple times: -vvv)
- `--dry-run, -d` - Output to console instead of file
- `-o, --output` - Output filename (default: codefetch-output-[timestamp].md)
- `--output-path` - Output directory path
- `--max-tokens` - Maximum token limit
- `--token-encoder` - Token encoder model (cl100k, p50k, r50k, o200k)
- `--token-count-only, -c` - Only output token count
- `--disable-line-numbers` - Disable line numbers in code blocks

### File Filtering

- `-e, --extension` - File extensions to include (e.g., ts,js,py)
- `--include-files` - Patterns for files to include
- `--exclude-files` - Patterns for files to exclude  
- `--include-dir` - Directories to include
- `--exclude-dir` - Directories to exclude

### Web Fetching Options

- `--url` - URL to fetch (website or git repository)
- `--max-pages` - Maximum pages to crawl (default: 50)
- `--max-depth` - Maximum crawl depth (default: 2)
- `--no-cache` - Disable cache for this request
- `--cache-ttl` - Cache time-to-live in hours (default: 1)
- `--branch` - Git branch to fetch (for repositories)
- `--ignore-robots` - Ignore robots.txt restrictions
- `--ignore-cors` - Ignore CORS restrictions
- `--no-api` - Disable GitHub API and use git clone instead
- `--github-token` - GitHub API token for private repos

### Display Options

- `-t, --project-tree` - Show project tree (0=off, 1+=depth)
- `--tracked-models` - Show token counts for specific models

### Advanced Options

- `-p, --prompt` - Use a built-in prompt template
- `--var` - Set template variables (e.g., --var PROJECT_NAME="My App")
- `--token-limiter` - Token limiting strategy (truncated, spread)

## Examples

### Analyze a TypeScript Project

```bash
codefetch -e ts,tsx --exclude-dir node_modules,dist \
  --max-tokens 50000 -o typescript-analysis.md
```

### Fetch Documentation Website

```bash
codefetch --url docs.example.com \
  --max-pages 100 \
  --max-depth 5 \
  --output docs-analysis.md
```

### Analyze a GitHub Repository

```bash
# Uses GitHub API by default (faster, no git required)
codefetch --url https://github.com/expressjs/express \
  --branch master \
  -e js --exclude-dir test,examples

# For private repositories
codefetch --url https://github.com/myorg/private-repo \
  --github-token ghp_your_token_here
```

### Use with AI Prompts

```bash
# Code review
codefetch -p review --var PROJECT_NAME="MyApp" -o review.md

# Generate tests
codefetch -p testgen -e ts,tsx --include-dir src

# Improve code quality
codefetch -p improve --max-tokens 30000
```

### Track Multiple Models

```bash
codefetch --tracked-models gpt-4,claude-3-opus,gpt-3.5-turbo
```

## Ignore Patterns

Create a `.codefetchignore` file to exclude files:

```
# Dependencies
node_modules/
vendor/
.pnpm-store/

# Build outputs
dist/
build/
out/
*.min.js
*.min.css

# Test files
*.test.ts
*.spec.js
__tests__/
coverage/

# Environment and logs
.env*
*.log
.DS_Store

# IDE
.vscode/
.idea/
*.swp
```

## Output Format

The generated markdown includes:

1. **Project Structure** - Tree view of the codebase
2. **File Contents** - Each file with syntax highlighting
3. **Token Count** - Total tokens for AI model context
4. **Metadata** - Timestamps and configuration used

Example output structure:

```markdown
Project Structure:
├── src/
│   ├── index.ts
│   ├── utils/
│   │   └── helpers.ts
│   └── components/
│       └── Button.tsx
└── package.json

src/index.ts:
\`\`\`typescript
1 | import { helper } from './utils/helpers';
2 | 
3 | export function main() {
4 |   console.log('Hello, world!');
5 | }
\`\`\`

[... more files ...]
```

## Caching

Web fetching results are cached to improve performance:

- Default cache location: `~/.codefetch/cache/`
- Default TTL: 1 hour
- Use `--no-cache` to bypass
- Use `--cache-ttl` to set custom expiration

## Performance Tips

1. **Use specific extensions**: `-e ts,tsx` is faster than processing all files
2. **Exclude test files**: `--exclude-files "*.test.ts,*.spec.js"`
3. **Limit crawl depth**: `--max-depth 2` for faster website fetching
4. **Set reasonable page limits**: `--max-pages 50` to avoid excessive crawling
5. **Use cache**: Subsequent fetches of the same URL will be instant

## Troubleshooting

### Common Issues

**"Token limit exceeded"**
- Use `--max-tokens` to set a higher limit
- Use `-e` to include only specific file types
- Use `--exclude-dir` to skip large directories

**"Failed to crawl URL"**
- Check if the URL is accessible
- Try with `--ignore-robots` if blocked by robots.txt
- Use `--no-cache` if cached data is stale

**"Command not found"**
- Ensure global installation: `npm install -g @codefetch/cli`
- Or use npx: `npx @codefetch/cli`

### Debug Mode

Use maximum verbosity for debugging:

```bash
codefetch -vvv --url example.com
```

## Integration

### Package.json Scripts

```json
{
  "scripts": {
    "docs:generate": "codefetch -e ts,tsx -o docs/codebase.md",
    "docs:analyze": "codefetch --token-count-only",
    "review": "codefetch -p review -o review.md"
  }
}
```

### CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Generate Documentation
  run: |
    npx @codefetch/cli \
      -e ts,tsx,js,jsx \
      --exclude-dir node_modules,coverage \
      -o codebase-docs.md
```

## Contributing

See the [main repository](https://github.com/codefetch-ai/codefetch) for contribution guidelines.

## License

MIT