---
description: Ask GPT‑5 Pro (Browser) with Codefetch context
argument-hint: PROMPT="<your question or task>"
---

# Ask GPT‑5 Pro (Browser engine)

## Instructions

1. **Research first**: Analyze the PROMPT to identify which files/directories are relevant to the task.
2. **Determine scope**: Based on your research, decide which files or directories to include:
   - Use `--include-files` for specific file patterns (supports globs, comma-separated): `"src/auth/**/*.ts,src/api/**/*.ts"`
   - Use `--include-dir` for entire directories (comma-separated): `"src/auth,src/utils"`
   - You can combine both options
3. **Generate context**: Run codefetch with the determined scope, limited to 50k tokens.
4. **Ask Oracle**: Use the generated markdown file with Oracle.

## Run

```bash
# 1) Research the codebase to determine relevant files/directories based on PROMPT
# Then generate context (limit ~50k tokens) using appropriate codefetch options:
#   --include-files "pattern1,pattern2"  for file globs
#   --include-dir "dir1,dir2"            for directories
#   Combine both if needed
npx codefetch --max-tokens 50000 \
  --include-files "src/auth/**/*,src/api/**/*" \
  --include-dir "src/utils"

# 2) Ask Oracle via Browser (no API key; macOS + Chrome)
npx -y @steipete/oracle --engine browser -m gpt-5-pro \
  -p "$PROMPT" \
  --file codefetch/codebase.md

# Optional helpers:
#   --files-report       # print per-file token usage
#   --preview            # inspect the bundle before sending
```


