export function printHelp() {
  console.log(`
Usage: codefetch [command] [options]

Commands:
  init                        Initialize a new codefetch project

Options:
  -o, --output <file>         Specify output filename (defaults to codebase.md)
  --dir <path>                Specify the directory to scan (defaults to current directory)
  --max-tokens <number>       Limit output tokens (default: 500,000)
  -e, --extension <ext,...>   Filter by file extensions (e.g., .ts,.js)
  --include-files <p,...>     Include specific files (supports patterns like *.ts)
  --exclude-files <p,...>     Exclude specific files (supports patterns like *.test.ts)
  --include-dir <dir,...>     Include specific directories
  --exclude-dir <dir,...>     Exclude specific directories
  -v, --verbose [level]       Show processing information (0=none, 1=basic, 2=debug)
  -t, --project-tree [depth]  Generate visual project tree (optional depth, default: 2)
  --token-encoder <type>      Token encoding method (simple, p50k, o200k, cl100k)
  --token-limiter <type>      Token limiting strategy (sequential, truncated)
  --disable-line-numbers      Disable line numbers in output
  -h, --help                  Display this help message
  -p, --prompt <type>         Add a default prompt (fix, improve, codegen, testgen) or add a custom prompt file with .md/.txt extension

Web Fetching Options:
  --url <URL>                 Fetch and analyze content from a URL (website or git repository)
  --no-cache                  Skip cache and fetch fresh content
  --cache-ttl <hours>         Cache time-to-live in hours (default: 1)
  --max-depth <n>             Maximum crawl depth for websites (default: no limit)
  --max-pages <n>             Maximum pages to crawl (default: no limit)
  --branch <name>             Git branch/tag/commit to fetch (for git repositories)
  --ignore-robots             Ignore robots.txt when crawling websites
  --ignore-cors               Ignore CORS restrictions (CLI-only feature)

Examples:
  # Analyze a local project
  codefetch --output analysis.md

  # Fetch and analyze a GitHub repository
  codefetch --url https://github.com/user/repo --branch main

  # Analyze a website (coming in Phase 2)
  codefetch --url https://docs.example.com --max-depth 3
`);
}
