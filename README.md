# boltfetch

Recursively fetches all code files in the current directory, ignoring what's in `.gitignore`,  
then outputs them into a single Markdown file with line numbers.

## Usage

```bash
npx boltfetch -o my-complete-source.md
```

If -o (or --output) is not provided, it will print to stdout.

## Installation

You can run directly with npx:

```bash
npx boltfetch
```

Or install globally:

```bash
npm install -g boltfetch
boltfetch -o output.md
```

## License

MIT 