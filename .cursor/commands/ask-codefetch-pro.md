# Ask Codefetch Pro

Generate codebase, copy to clipboard, open AI chat.

## Workflow

1. Research: identify relevant files/directories for PROMPT
2. Run: codefetch open with scoped files → copies to clipboard, opens browser
3. Paste: codebase in clipboard, paste into AI chat

## Run

```bash
# ChatGPT (default)
npx codefetch open --max-tokens 50000 \
  --token-encoder o200k \
  --project-tree 3 \
  --include-files "src/**/*.ts"

# Gemini
npx codefetch open --chat-url gemini.google.com --chat-model gemini-3.0 \
  --max-tokens 50000 --include-files "src/**/*.ts"

# Claude
npx codefetch open --chat-url claude.ai --chat-model claude-3.5-sonnet \
  --max-tokens 50000 --include-files "src/**/*.ts"

# Copy only (no browser)
npx codefetch open --no-browser --max-tokens 50000 --include-files "src/**/*.ts"
```

## Options

Chat:
- --chat-url <url> (default: chatgpt.com)
- --chat-model <model> (default: gpt-5-1-pro)
- --chat-prompt <text>
- --no-browser (copy only)

Scope:
- --include-files "pattern1,pattern2"
- --include-dir "dir1,dir2"
- --exclude-dir "test,dist"
- --exclude-markdown
- -e .ts,.js

Tokens:
- --max-tokens 50000
- --project-tree 3
