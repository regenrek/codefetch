# codefetch

![Codefetch Cover](/public/cover.png)

>Turn code into Markdown for LLMs with one simple terminal command



Recursively fetches all code files in the current directory, ignoring what's in `.gitignore` and `.codefetchignore`, then outputs them into a single Markdown file with line numbers.

## Usage
Basic usage with output file and tree
```bash
npx codefetch -o my-complete-source.md -t
```

With token limit (useful for AI models):
```bash
npx codefetch -tok 20000 -o output.md
```

Filter by file extensions:
```bash
npx codefetch -e .ts,.js -o typescript-files.md
```

Include or exclude specific files and directories:
```bash
# Exclude node_modules and public directories
npx codefetch --exclude-dir=node_modules,public -o output.md

# Include only TypeScript files
npx codefetch --include-files=*.ts -o typescript-only.md

# Include src directory, exclude test files
npx codefetch --include-dir=src --exclude-files=*.test.ts -o src-no-tests.md
```

If no output file is specified (`-o` or `--output`), it will print to stdout.

### Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--output <file>` | `-o` | Specify output filename |
| `--max-tokens <number>` | `-tok` | Limit output tokens (useful for AI models) |
| `--extension <ext,...>` | `-e` | Filter by file extensions (e.g., .ts,.js) |
| `--include-files <pattern,...>` | `-if` | Include specific files (supports patterns like *.ts) |
| `--exclude-files <pattern,...>` | `-ef` | Exclude specific files (supports patterns like *.test.ts) |
| `--include-dir <dir,...>` | `-id` | Include specific directories |
| `--exclude-dir <dir,...>` | `-ed` | Exclude specific directories |
| `--verbose [level]` | `-v` | Show processing information (0=none, 1=basic, 2=debug) |
| `--project-tree [depth]` | `-t` | Generate visual project tree (optional depth, default: 2) |

All options that accept multiple values use comma-separated lists. File patterns support wildcards (e.g., `*.ts`, `src/*.js`).

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

### Project Tree

You can generate a visual tree representation of your project structure:

```bash
# Generate tree with default depth (2 levels)
npx codefetch --project-tree

# Generate tree with custom depth
npx codefetch -t 3

# Generate tree and save code to file
npx codefetch -t 2 -o output.md
```

Example output:
```
Project Tree:
└── my-project
    ├── src
    │   ├── index.ts
    │   ├── types.ts
    │   └── utils
    ├── tests
    │   └── index.test.ts
    └── package.json
```

## Ignoring Files

codefetch supports two ways to ignore files:

1. `.gitignore` - Respects your project's existing `.gitignore` patterns
2. `.codefetchignore` - Additional patterns specific to codefetch

The `.codefetchignore` file works exactly like `.gitignore` and is useful when you want to ignore files that aren't in your `.gitignore`. For example:

```gitignore
codefetch # the codefetch folder itself
*.css # all css files
```

Both files support standard gitignore patterns including:
- Exact matches (`file.txt`)
- Directories (`dir/`)
- Wildcards (`*.log`)
- Negation (`!important.log`)


### Default Ignore Patterns

This tool uses a comprehensive set of default ignore patterns to exclude common files and directories that typically don't need to be included in code reviews or LLM analysis. You can view the complete list of default patterns in [default-ignore.ts](src/default-ignore.ts).

## Output Directory

By default, when using the `-o` or `--output` option, codefetch will:
1. Create a `codefetch/` directory in your project
2. Store all output files in this directory
3. Create a `.codefetchignore` file (if it doesn't exist) that includes the `codefetch/` directory

This ensures that:
- Your fetched code is organized in one place
- Subsequent runs don't fetch already fetched code
- The output directory can be safely ignored in version control

We recommend adding `codefetch/` to your `.gitignore` file to avoid committing the fetched codebase. 


## Use with AI Tools

You can use this command to create code-to-markdown in [bolt.new](https://bolt.new), [cursor.com](https://cursor.com), ... and ask the AI chat for guidance about your codebase. The `-tok` option helps ensure your output stays within AI model token limits.



### Debugging

The `--verbose` or `-v` option supports different levels of output:

```bash
# No verbose output (just results)
npx codefetch -o output.md

# Basic progress information (level 1)
npx codefetch -v -o output.md
# or
npx codefetch -v 1 -o output.md

# Detailed debug information (level 2)
npx codefetch -v 2 -o output.md
```

Verbose levels:
- Level 0: Only shows essential output (final results)
- Level 1: Shows basic progress (file counts, processing stages)
- Level 2: Shows detailed debug information (individual file processing, skipped files, etc.)

## License

MIT 


## Links

- X/Twitter: [@kregenrek](https://x.com/kregenrek)
- Bluesky: [@kevinkern.dev](https://bsky.app/profile/kevinkern.dev)
- Ultimate Cursor AI Course: [Instructa.ai](https://www.instructa.ai/en/cursor-ai)

## Credits

This project was inspired by 

* [codetie](https://github.com/codetie-ai/codetie) CLI made by [@kevinkern](https://github.com/regenrek) & [@timk](https://github.com/KerneggerTim)
* [sitefetch](https://github.com/egoist/sitefetch) CLI made by [@egoist](https://github.com/egoist). While sitefetch is great for fetching documentation and websites, codefetch focuses on fetching local codebases for AI analysis.

