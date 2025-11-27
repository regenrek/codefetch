---
description: Quick codefetch workflow - run help first, then generate and open AI chat
argument-hint: [PROMPT=<task-description>]
---

# Ask Codefetch Quick

Generate codebase, copy to clipboard, open AI chat.

## Workflow

1. Help: run `codefetch help` to see all available options
2. Research: identify relevant files/directories for PROMPT
3. Run: codefetch open with scoped files → copies to clipboard, opens browser
4. Paste: codebase in clipboard, paste into AI chat

## Step 1: Get Help

```bash
npx codefetch help
npx codefetch open --help
```

## Step 2: Run

```bash
npx codefetch open --max-tokens 50000 \
  --project-tree 3 \
  --include-files "src/**/*.ts" \
  -p prompt.md
```

Adjust options based on PROMPT requirements.
