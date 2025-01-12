# codefetch

![Codefetch Cover](/public/cover.png)


Recursively fetches all code files in the current directory, ignoring what's in `.gitignore` and `.boltfetchignore`,  
then outputs them into a single Markdown file with line numbers.

## Usage

```bash
npx codefetch -o my-complete-source.md
```

If -o (or --output) is not provided, it will print to stdout.

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

```
# .codefetchignore
*.test.js
docs/
temp/
*.md
```

Both files support standard gitignore patterns including:
- Exact matches (file.txt)
- Directories (dir/)
- Wildcards (*.log)
- Negation (!important.log)

## License

MIT 