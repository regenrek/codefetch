# Codefetch MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with tools to analyze codebases and generate structured documentation.

## Overview

The Codefetch MCP server enables AI assistants like Claude to:

- Analyze local codebases and convert them to AI-friendly markdown
- Respect `.gitignore` and `.codefetchignore` patterns
- Count tokens for various AI models
- Generate project structure visualizations
- Apply smart filtering by file extensions and directories

## Installation

### Via NPX (Recommended)

```bash
npx @codefetch/mcp-server
```

### Global Installation

```bash
npm install -g @codefetch/mcp-server
```

### Local Installation

```bash
npm install @codefetch/mcp-server
```

## Configuration

### Claude Desktop

Add the Codefetch server to your Claude Desktop configuration:

#### macOS

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "codefetch": {
      "command": "npx",
      "args": ["@codefetch/mcp-server"]
    }
  }
}
```

#### Windows

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "codefetch": {
      "command": "npx",
      "args": ["@codefetch/mcp-server"]
    }
  }
}
```

### With Environment Variables

You can configure default settings via environment variables:

```json
{
  "mcpServers": {
    "codefetch": {
      "command": "npx",
      "args": ["@codefetch/mcp-server"],
      "env": {
        "CODEFETCH_MAX_TOKENS": "100000",
        "CODEFETCH_TOKEN_ENCODER": "cl100k",
        "CODEFETCH_PROJECT_TREE": "2"
      }
    }
  }
}
```

## Available Tools

### `analyze_codebase`

Analyzes a codebase and returns structured markdown documentation.

**Parameters:**

- `path` (required): Directory path to analyze
- `extensions`: Comma-separated list of file extensions (e.g., "ts,tsx,js,jsx")
- `excludeDirs`: Comma-separated list of directories to exclude
- `includeDirs`: Comma-separated list of directories to include
- `excludeFiles`: Comma-separated list of file patterns to exclude
- `includeFiles`: Comma-separated list of file patterns to include
- `maxTokens`: Maximum token limit (default: 500000)
- `tokenEncoder`: Token encoder model ("cl100k", "p50k", "r50k", "o200k")
- `projectTree`: Project tree depth (0 for none, 1+ for tree levels)
- `disableLineNumbers`: Disable line numbers in code blocks

**Example Usage in Claude:**

```
Use the analyze_codebase tool to analyze the /Users/me/project directory,
including only TypeScript files and excluding test files.
```

### `count_tokens`

Counts tokens in the provided text using the specified encoder.

**Parameters:**

- `text` (required): Text to count tokens for
- `encoder`: Token encoder to use (default: "cl100k")

**Example Usage in Claude:**

```
Count the tokens in this text using the GPT-4 encoder.
```

## Usage Examples

### Basic Analysis

```
Analyze the codebase at /path/to/project
```

### Filtered Analysis

```
Analyze /path/to/project including only .ts and .tsx files,
excluding the test and dist directories
```

### With Token Limit

```
Analyze /path/to/project with a maximum of 50000 tokens
```

### Project Structure Only

```
Show me the project structure of /path/to/project with depth 3
```

## Features

### Intelligent File Filtering

- Automatically respects `.gitignore` patterns
- Supports custom `.codefetchignore` files
- Built-in exclusion of common non-source files

### Token Management

- Accurate token counting for various AI models
- Configurable token limits
- Support for different token encoders

### Output Formatting

- Structured markdown with syntax highlighting
- Optional line numbers
- Project tree visualization
- Clean, AI-friendly formatting

## Environment Variables

- `CODEFETCH_MAX_TOKENS`: Default maximum token limit
- `CODEFETCH_TOKEN_ENCODER`: Default token encoder
- `CODEFETCH_PROJECT_TREE`: Default project tree depth
- `CODEFETCH_DISABLE_LINE_NUMBERS`: Disable line numbers by default

## Troubleshooting

### Server Not Starting

1. Ensure you have Node.js 18+ installed
2. Check Claude Desktop configuration syntax
3. Verify the command path is correct

### Permission Errors

- Ensure Claude Desktop has file system access permissions
- On macOS, grant Full Disk Access if needed

### Large Codebases

- Use `maxTokens` to limit output size
- Filter by specific extensions or directories
- Exclude unnecessary directories like `node_modules`

## Development

### Running Locally

```bash
# Clone the repository
git clone https://github.com/codefetch-ai/codefetch
cd codefetch/mcp

# Install dependencies
pnpm install

# Run in development mode
pnpm dev
```

### Building

```bash
pnpm build
```

### Testing with Claude Desktop

1. Build the server locally
2. Update Claude Desktop config to point to local build:

```json
{
  "mcpServers": {
    "codefetch-dev": {
      "command": "node",
      "args": ["/path/to/codefetch/mcp/dist/index.js"]
    }
  }
}
```

## Architecture

The MCP server is built on:

- `@modelcontextprotocol/sdk`: Official MCP SDK
- `codefetch-sdk`: Core Codefetch functionality
- TypeScript for type safety
- ES modules for modern JavaScript

## Contributing

See the [main repository](https://github.com/codefetch-ai/codefetch) for contribution guidelines.

## License

MIT
