---
description: Generate codebase with codefetch, copy to clipboard, and open AI chat
argument-hint: [PROMPT=<task-description>]
---

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
