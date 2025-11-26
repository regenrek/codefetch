# Ask Codefetch - Context Gather

Gather narrowed codebase context efficiently in one file.

## Workflow

1. Research: Analyze PROMPT, identify relevant files/directories
2. Generate: Run codefetch with scoped files, output to single .md file
3. Read: Use generated codefetch/codebase.md as narrowed context (not individual files)

## Why

Reading one consolidated .md file is more efficient than reading multiple files separately. Codefetch combines relevant code into structured markdown with file paths, saving agent token window space.

## Run

```bash
# Step 1: Research - determine relevant files based on PROMPT
# Step 2: Generate - run codefetch with scoped files

npx codefetch --max-tokens 50000 \
  --output codefetch/codebase.md \
  --token-encoder o200k \
  --project-tree 3 \
  --include-files "src/auth/**/*.ts,src/api/**/*.ts" \
  --include-dir "src/utils"

# Step 3: Read the generated file
# Read: codefetch/codebase.md
```

## Scoping Options

- `--include-files "pattern1,pattern2"` - file globs (e.g., `"src/**/*.ts,lib/**/*.js"`)
- `--include-dir "dir1,dir2"` - directories (e.g., `"src/auth,src/utils"`)
- `--exclude-dir "test,dist,node_modules"` - exclude directories
- `--exclude-files "*.test.ts,*.spec.ts"` - exclude file patterns
- `--exclude-markdown` - exclude .md files
- `-e .ts,.js` - filter by extension only

## Token Control

- `--max-tokens 50000` - limit output tokens
- `--project-tree 3` - include tree (depth 3)
- `--project-tree 0` - no tree (saves tokens)
- `--token-encoder o200k` - GPT-4o encoding
