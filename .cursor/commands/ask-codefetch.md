# Ask Codefetch

Gather narrowed codebase context in one file.

## Workflow

1. Research: identify relevant files/directories for PROMPT
2. Generate: run codefetch with scoped files → single .md
3. Read: use codefetch/codebase.md as context (not individual files)

## Run

```bash
npx codefetch --max-tokens 50000 \
  --output codefetch/codebase.md \
  --token-encoder o200k \
  --project-tree 3 \
  --include-files "src/auth/**/*.ts,src/api/**/*.ts" \
  --include-dir "src/utils"
```

Then read: codefetch/codebase.md

## Options

Scope:
- --include-files "pattern1,pattern2" (globs)
- --include-dir "dir1,dir2"
- --exclude-dir "test,dist"
- --exclude-files "*.test.ts"
- --exclude-markdown
- -e .ts,.js (extension filter)

Tokens:
- --max-tokens 50000
- --project-tree 3 (0=none)
- --token-encoder o200k
