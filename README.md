# codefetch

![Codefetch Cover](/public/cover.png)

Recursively fetches all code files in the current directory, ignoring what's in `.gitignore` and `.codefetchignore`,  
then outputs them into a single Markdown file with line numbers.

## Usage

Basic usage with output file:
```bash
npx codefetch -o my-complete-source.md
```

With token limit (useful for AI models):
```bash
npx codefetch --max-tokens 20000 -o output.md
# or
npx codefetch -tok 20000 -o output.md
```

Filter by file extensions:
```bash
npx codefetch -e .ts,.js -o typescript-files.md
# or
npx codefetch --extension ts,js -o typescript-files.md
```

If no output file is specified (`-o` or `--output`), it will print to stdout.

### Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--output <file>` | `-o` | Specify output filename |
| `--max-tokens <number>` | `-tok` | Limit output tokens (useful for AI models) |
| `--extension <ext,...>` | `-e` | Filter by file extensions (e.g., .ts,.js) |

## Installation

You can run directly with npx:
```bash
npx codefetch
```

Or install globally:
```bash
npm install -g codefetch
codefetch -o output.md
```

## Ignoring Files

codefetch supports two ways to ignore files:

1. `.gitignore` - Respects your project's existing `.gitignore` patterns
2. `.codefetchignore` - Additional patterns specific to codefetch

The `.codefetchignore` file works exactly like `.gitignore` and is useful when you want to ignore files that aren't in your `.gitignore`. For example:

```gitignore
# .codefetchignore
*.test.js
docs/
temp/
*.md
```

Both files support standard gitignore patterns including:
- Exact matches (`file.txt`)
- Directories (`dir/`)
- Wildcards (`*.log`)
- Negation (`!important.log`)

## Use with AI Tools

You can use this command to create code-to-markdown in [bolt.new](https://bolt.new) and ask the AI chat for guidance about your codebase. The `--max-tokens` option helps ensure your output stays within AI model token limits.

## License

MIT 