# Ask Codefetch Pro - Open GPT/Gemini/Claude

Generate codebase, copy to clipboard, and open AI chat in browser.

## Instructions

1. Research: Analyze PROMPT to identify relevant files/directories
2. Scope: Decide what to include:
   - `--include-files` for file patterns (globs, comma-separated): `"src/auth/**/*.ts,src/api/**/*.ts"`
   - `--include-dir` for directories (comma-separated): `"src/auth,src/utils"`
   - Combine both if needed
3. Run: Execute codefetch open with scope
4. Paste: Codebase is in clipboard, paste into AI chat and ask your question

## Run

```bash
# Default: opens ChatGPT, copies codebase to clipboard
npx codefetch open --max-tokens 50000 \
  --token-encoder o200k \
  --project-tree 3 \
  --include-files "src/**/*.ts" \
  --include-dir "src"

# Gemini
npx codefetch open --chat-url gemini.google.com --chat-model gemini-3.0 \
  --max-tokens 50000 --include-files "src/**/*.ts"

# Claude
npx codefetch open --chat-url claude.ai --chat-model claude-3.5-sonnet \
  --max-tokens 50000 --include-files "src/**/*.ts"

# Copy only, no browser
npx codefetch open --no-browser --max-tokens 50000 --include-files "src/**/*.ts"
```

## Options Reference

- `--chat-url <url>` - AI chat URL (default: chatgpt.com)
- `--chat-model <model>` - model parameter (default: gpt-5-1-pro)
- `--chat-prompt <text>` - custom prompt message
- `--no-browser` - copy only, skip browser
- `--include-files "pattern1,pattern2"` - file globs
- `--include-dir "dir1,dir2"` - directories
- `--exclude-dir "test,dist"` - exclude directories
- `--exclude-markdown` - exclude .md files
- `-e .ts,.js` - filter by extension
- `--max-tokens 50000` - token limit
- `--project-tree 3` - tree depth
