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
  --format <type>             Output format (markdown, json) (default: markdown)
  -h, --help                  Display this help message
  -p, --prompt <type>         Add a default prompt (fix, improve, codegen, testgen) or add a custom prompt file with .md/.txt extension

Git Repository Options:
  --url <URL>                 Fetch and analyze content from a git repository URL
  --no-cache                  Skip cache and fetch fresh content
  --cache-ttl <hours>         Cache time-to-live in hours (default: 1)
  --branch <name>             Git branch/tag/commit to fetch
  --no-api                    Disable GitHub API and use git clone instead
  --github-token <token>      GitHub API token for private repos (or set GITHUB_TOKEN env var)

Web Crawling Options:
  --max-pages <number>        Maximum pages to crawl (default: 50)
  --max-depth <number>        Maximum crawl depth (default: 2)
  --ignore-robots             Ignore robots.txt restrictions
  --ignore-cors               Ignore CORS restrictions

Examples:
  # Analyze a local project
  codefetch --output analysis.md

  # Fetch and analyze a GitHub repository (uses API by default)
  codefetch --url https://github.com/user/repo --branch main

  # Fetch private GitHub repo with token
  codefetch --url https://github.com/org/private-repo --github-token ghp_xxxxx

  # Force git clone instead of API
  codefetch --url https://github.com/user/repo --no-api

  # Analyze from GitLab or Bitbucket
  codefetch --url https://gitlab.com/user/repo
  codefetch --url https://bitbucket.org/user/repo
`);
}
