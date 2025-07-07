# Overview

codefetch is fantastic for capturing an entire working tree, but many practical review tasks require only the delta between two Git refs (e.g., HEAD vs main). Right now users must script around this with git diff and manual flag assembly.

This proposal adds a first-class diff/compare workflow that:

- Lets users focus on changed paths only, keeping token counts low.
- Optionally ingests both branches in full (with clear prefixes) when deeper context is needed.
- Stays fully backward-compatible by layering on the existing @codefetch/sdk APIs.

## User Stories

| As a …    | I want to …                                               | So that …                                              |
|-----------|-----------------------------------------------------------|--------------------------------------------------------|
| Reviewer  | Ask an LLM "what changed in my PR?"                      | I don't exceed token limits or juggle two dumps.      |
| CI bot    | Post a Markdown summary of modified files                | Build comments are fast and deterministic.            |
| Developer | Generate a full dual-tree dump when context is critical  | The LLM can reason about both versions of every file. |

## CLI Design

### 1. Quick diff (single-branch context)

```bash
# Include ONLY files changed vs <ref>
npx codefetch --changed-since main                 # main…HEAD
npx codefetch --changed-since v1.5.0               # tag…HEAD
npx codefetch --changed-since origin/main \
              --include-dir src,test
```

Internally runs `git diff --name-only <ref>...HEAD` and maps the list into `--include-files`.

All existing flags (`--exclude-files`, `--token-encoder`, etc.) apply.

### 2. Full two-tree comparison

```bash
# Shortcut: compare current HEAD to main (full context, both branches)
npx codefetch --compare-to main

# Explicit sub-command for symmetry
npx codefetch compare \
  --source-branch main \
  --source-include-dir src/test \
  --current-branch feat/monorepo \
  --current-include-dir packages/cli/test
```

| Flag | Purpose | Default |
|------|---------|---------|
| `--compare-to <ref>` | Alias for compare with `--source-branch=<ref>` and same filters on both trees. | — |
| `compare` sub-command | Orchestrates dual-tree capture. | — |
| `--source-branch` / `--current-branch` | Git refs to read. | main / HEAD |
| `--source-include-dir` / `--current-include-dir` | Independent directory globs. | fall back to global `--include-dir` |
| (all existing global flags) | Apply to both trees unless overridden. | — |

### Output sketch (markdown mode)

<details>
<summary>Example</summary>

```markdown
## source/main/path/to/file.ts
```ts
1 | original line…
```

## current/feat/monorepo/path/to/file.ts
```ts
1 | updated line…
```
```

</details>

*For JSON mode, each `FileNode` gains a top-level `branch` ("source" or "current") or the path is prefixed.*

---

## Implementation Notes

* **No SDK changes needed for `--changed-since`.**  
  The CLI computes `changedFiles[]` and passes it to `collectFiles`.

* **`compare` mode**  
  1. Checkout each branch into a **separate work-tree** (or use `git show` pipes).  
  2. Call `collectFiles` twice with per-tree options.  
  3. Concatenate results, prefixing paths (`source/…`, `current/…`).  
  4. Feed the merged list into `generateMarkdown` / `collectFilesAsTree`.

* **Token accounting** — existing `--max-tokens` logic suffices.  
* **Deleted / renamed files** — use `git diff --name-status -M` to annotate `D` and `R` entries.

---

## Examples & Recipes (Today)

Until this lands, users can approximate the behaviour with Git plumbing:

### Token-efficient diff dump (Bash)

```bash
npx codefetch --include-files "$(git diff --name-only main...HEAD | paste -sd, -)"
```

### Directory-level context

```bash
git diff --name-only main...HEAD \
  | xargs -n1 dirname \
  | sort -u > dirs.txt

eval npx codefetch $(awk '{printf "--include-dir=%s ", $0}' dirs.txt)
```

## Acceptance Criteria

- [ ] New flag `--changed-since <ref>` selects only modified files vs `<ref>`.
- [ ] `--compare-to <ref>` and `compare` sub-command capture both branches in a single output with clear prefixes.
- [ ] All existing include/exclude flags operate per expectations.
- [ ] Help text and README updated; examples provided.
- [ ] Unit tests cover: changed-file list generation, dual-tree prefixing, deleted/renamed handling.

## Alternatives Considered

| Option | Why rejected |
|--------|--------------|
| Rely solely on external scripts | Inconvenient, error-prone, duplicates logic across teams. |
| Patch-only diff (git diff text) | Loses surrounding context needed for deeper LLM analysis. |

---

Thank you for considering this enhancement!
I'm happy to help refine the spec or prototype the CLI layer changes.