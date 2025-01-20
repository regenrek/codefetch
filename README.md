# codefetch

![Codefetch Cover](/public/cover.jpeg)

[![npm (tag)](https://img.shields.io/npm/v/codefetch)](https://www.npmjs.com/package/codefetch)

>Turn code into Markdown for LLMs with one simple terminal command


Fetches all code files in the current directory, ignoring what's in `.gitignore` and `.codefetchignore`, then outputs them into a single Markdown file with line numbers.

Click here for a [Demo & Videos](https://x.com/kregenrek/status/1878487131099898269)

## Usage
Basic usage with output file and tree
```bash
npx codefetch
# You codebase will be saved to `codefetch/codebase.md`
```

Include a default prompt:
```bash
npx codefetch -p improve
```

Include a tree with depth
```bash
npx codefetch -t 3
```

Filter by file extensions:
```bash
npx codefetch -e .ts,.js -o typescript-files.md --token-encoder cl100k
```

Include or exclude specific files and directories:
```bash
# Exclude node_modules and public directories
npx codefetch --exclude-dir test,public

# Include only TypeScript files
npx codefetch --include-files "*.ts" -o typescript-only.md

# Include src directory, exclude test files
npx codefetch --include-dir src --exclude-files "*.test.ts" -o src-no-tests.md
```

Dry run (only output to console)
```bash
npx codefetch --d
```

If no output file is specified (`-o` or `--output`), it will print to `codefetch/codebase.md`

## Options

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Specify output filename (defaults to codebase.md) |
| `--dir <path>` | Specify the directory to scan (defaults to current directory) |
| `--max-tokens <number>` | Limit output tokens (default: 500,000) |
| `-e, --extension <ext,...>` | Filter by file extensions (e.g., .ts,.js) |
| `--token-limiter <type>` | Token limiting strategy when using --max-tokens (sequential, truncated) |
| `--include-files <pattern,...>` | Include specific files (supports patterns like *.ts) |
| `--exclude-files <pattern,...>` | Exclude specific files (supports patterns like *.test.ts) |
| `--include-dir <dir,...>` | Include specific directories |
| `--exclude-dir <dir,...>` | Exclude specific directories |
| `-v, --verbose [level]` | Show processing information (0=none, 1=basic, 2=debug) |
| `-t, --project-tree [depth]` | Generate visual project tree (optional depth, default: 2) |
| `--token-encoder <type>` | Token encoding method (simple, p50k, o200k, cl100k) |
| `--disable-line-numbers` | Disable line numbers in output |
| `-d, --dry-run` | Output markdown to stdout instead of file |

All options that accept multiple values use comma-separated lists. File patterns support simple wildcards:
- `*` matches any number of characters
- `?` matches a single character

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

### Using Prompts

You can add predefined or custom prompts to your output:

```bash
# Use default prompt (looks for codefetch/prompts/default.md)
npx codefetch -p
npx codefetch --prompt

# Use built-in prompts
npx codefetch -p fix # fixes codebase
npx codefetch -p improve # improves codebase
npx codefetch -p codegen # generates code
npx codefetch -p testgen # generates tests

# Use custom prompts
npx codefetch --prompt custom-prompt.md
npx codefetch -p my-architect.txt
```

#### Custom Prompts

Create custom prompts in `codefetch/prompts/` directory:

1. Create a markdown file (e.g., `codefetch/prompts/my-prompt.md`)
2. Use it with `--prompt my-prompt.md`

You can also set a default prompt in your `codefetch.config.mjs`:

```js
export default {
  defaultPromptFile: "dev", // Use built-in prompt
}

export default {
  defaultPromptFile: "custom-prompt.md", // Use custom prompt file
}
```

The prompt resolution order is:
1. CLI argument (`-p` or `--prompt`)
2. Config file prompt setting
3. No prompt if neither is specified

When using just `-p` or `--prompt` without a value, codefetch will look for `codefetch/prompts/default.md`.

## Token Limiting Strategies

When using `--max-tokens`, you can control how tokens are distributed across files using the `--token-limiter` option:

```bash
# Sequential mode - process files in order until reaching token limit
npx codefetch --max-tokens 500 --token-limiter sequential

# Truncated mode (default) - distribute tokens evenly across all files
npx codefetch --max-tokens 500 --token-limiter truncated
```

![tokenlimiter](/public/tokenlimiter.png)

- `sequential`: Processes files in order until the total token limit is reached. Useful when you want complete content from the first files.
- `truncated`: Distributes tokens evenly across all files, showing partial content from each file. This is the default mode and is useful for getting an overview of the entire codebase.

## Ignoring Files

codefetch supports two ways to ignore files:

1. `.gitignore` - Respects your project's existing `.gitignore` patterns
2. `.codefetchignore` - Additional patterns specific to codefetch

The `.codefetchignore` file works exactly like `.gitignore` and is useful when you want to ignore files that aren't in your `.gitignore`. 

### Default Ignore Patterns

Codefetch uses a set of default ignore patterns to exclude common files and directories that typically don't need to be included in code reviews or LLM analysis. 

You can view the complete list of default patterns in [default-ignore.ts](src/default-ignore.ts).

## Token Counting

Codefetch supports different token counting methods to match various AI models:

- `simple`: Basic word-based estimation (not very accurate but fastest!)
- `p50k`: GPT-3 style tokenization
- `o200k`: gpt-4o style tokenization  
- `cl100k`: GPT-4 style tokenization

Select the appropriate encoder based on your target model:

```bash
# For GPT-4o
npx codefetch --token-encoder o200k
```

## Output Directory

By default (unless using --dry-run) codefetch will:
1. Create a `codefetch/` directory in your project
2. Store all output files in this directory

This ensures that:
- Your fetched code is organized in one place
- The output directory won't be fetched so we avoid fetching the codebase again

Add `codefetch/` to your `.gitignore` file to avoid committing the fetched codebase. 

## Use with AI Tools

You can use this command to create code-to-markdown in [bolt.new](https://bolt.new), [cursor.com](https://cursor.com), ... and ask the AI chat for guidance about your codebase. 


## Or install globally:
```bash
npm install -g codefetch
codefetch -o output.md
```

## Integrate codefetch into your project

Initialize your project with codefetch:

```bash
npx codefetch init
```

This will:
1. Create a `.codefetchignore` file for excluding files
2. Generate a `codefetch.config.mjs` with your preferences
3. Set up the project structure


### `codefetch.config.mjs` Config File

Create a `codefetch.config.mjs` file in your project root:

```js
export default {
  // Output settings
  outputPath: "codefetch", // Directory for output files
  outputFile: "codebase.md", // Output filename
  maxTokens: 999_000, // Token limit
  disableLineNumbers: false, // Toggle line numbers in output
  
  // Processing options
  verbose: 1, // Logging level (0=none, 1=basic, 2=debug)
  projectTree: 2, // Project tree depth
  defaultIgnore: true, // Use default ignore patterns
  gitignore: true, // Respect .gitignore
  dryRun: false, // Output to console instead of file
  
  // Token handling
  tokenEncoder: "simple", // Token counting method (simple, p50k, o200k, cl100k)
  tokenLimiter: "truncated", // Token limiting strategy
  
  // File filtering
  extensions: [".ts", ".js"], // File extensions to include
  includeFiles: ["src/**/*.ts"], // Files to include (glob patterns)
  excludeFiles: ["**/*.test.ts"], // Files to exclude
  includeDirs: ["src", "lib"], // Directories to include
  excludeDirs: ["test", "dist"], // Directories to exclude
  
  // AI/LLM settings
  trackedModels: [
    "chatgpt-4o-latest",
    "claude-3-5-sonnet-20241022",
    "o1",
    "deepseek-v3",
    "gemini-exp-1206",
  ],
  
  // Prompt handling
  prompt: "dev", // Built-in prompt or custom prompt file
  defaultChat: "https://chat.com", // Default chat URL
  templateVars: {}, // Variables for template substitution
}
```

All configuration options are optional and will fall back to defaults if not specified. You can override any config option using CLI arguments.

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

