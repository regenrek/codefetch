# Ask Codefetch - Context Gather

Gather codebase context for agent analysis.

## Instructions

1. Research: Analyze PROMPT to identify relevant files/directories
2. Scope: Decide what to include:
   - `--include-files` for file patterns (globs, comma-separated): `"src/auth/**/*.ts,src/api/**/*.ts"`
   - `--include-dir` for directories (comma-separated): `"src/auth,src/utils"`
   - Combine both if needed
3. Generate: Run codefetch with scope, limit 50k tokens
4. Analyze: Use the generated markdown for your response

## Run

```bash
# Research codebase, determine relevant files/directories based on PROMPT
# Then generate context (limit ~50k tokens):

npx codefetch --max-tokens 50000 \
  --output codefetch/codebase.md \
  --token-encoder o200k \
  --project-tree 3 \
  --include-files "src/**/*.ts" \
  --include-dir "src"
```

## Options Reference

- `--include-files "pattern1,pattern2"` - file globs
- `--include-dir "dir1,dir2"` - directories
- `--exclude-dir "test,dist"` - exclude directories
- `--exclude-markdown` - exclude .md files
- `-e .ts,.js` - filter by extension
- `--max-tokens 50000` - token limit
- `--project-tree 3` - tree depth
- `--copy` - copy to clipboard
