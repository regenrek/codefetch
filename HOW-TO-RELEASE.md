# How To Release codefetch

This project ships via the Node script at `scripts/release-fix-workspace.ts`. The script bumps versions, builds, publishes to npm, pushes tags, and creates a GitHub Release with notes from `CHANGELOG.md`.

## PR vs Release Workflow

**Not every PR is a release.** The typical workflow is:

1. **PRs** → Merge features/fixes to `main` (run mandatory checks below)
2. **Accumulate** → Multiple PRs can be merged before a release
3. **Release** → When ready, run the release script to publish to npm

**When to release:**
- After significant features or bug fixes
- Before announcing to users
- When breaking changes need to be shipped
- Periodic releases (e.g., weekly/monthly)

---

## Mandatory Checks (Before Merging ANY PR)

These checks must pass before merging. If any fail, **STOP** and fix the issue.

### 1. Linting ✅

```bash
pnpm lint
```

**Criteria**: Zero errors. Warnings are acceptable but should be minimized.

### 2. Type Checking ✅

```bash
pnpm -C packages/sdk build
pnpm -C packages/cli build
```

**Criteria**: Build completes successfully with no TypeScript errors.

### 3. Tests ✅

```bash
pnpm test
```

**Criteria**: 100% of tests pass (skipped tests are acceptable if documented).

### 4. Code Coverage 📊

```bash
pnpm test 2>&1 | grep -E "(% Stmts|All files)"
```

**Criteria**:
| Package | Minimum Statements | Minimum Branches |
|---------|-------------------|------------------|
| SDK     | 70%               | 70%              |
| CLI     | 75%               | 60%              |

> **Note**: Some areas have lower coverage due to entry points, worker-specific code, and external dependencies. Target 80%+ for core business logic.

### 5. Changelog Updated 📝

All changes must be documented:
- `/CHANGELOG.md` (root - user-facing)
- `/packages/cli/CHANGELOG.md`
- `/packages/sdk/CHANGELOG.md`

### Release Blockers

❌ Any linting errors
❌ Any TypeScript compilation errors  
❌ Any failing tests
❌ Coverage below thresholds
❌ Missing changelog entries

---

## Prerequisites (For npm Release)

- Node 18+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate` works too)
- GitHub CLI (`gh auth status` shows logged in)
- npm auth: `npm whoami` works; 2FA ready if enabled
- Clean `main` branch pushed to origin

## Prepare for Release

1. Ensure all PRs are merged to `main`
2. Update `CHANGELOG.md` with a new section (e.g., `## [2.0.4] - YYYY-MM-DD`)
3. Ensure any user-facing docs (README, templates) are committed

## Quick Release

Patch/minor/major bump and publish:

```bash
pnpm tsx scripts/release-fix-workspace.ts patch  # or minor/major
```

The script will:
- Build all packages sequentially (SDK first, then CLI and MCP)
- Bump versions in `packages/cli/package.json` and `packages/sdk/package.json`
- Replace workspace dependencies with actual versions
- Create git commit `chore: release vX.Y.Z` and tag `vX.Y.Z`
- Publish packages to npm (`codefetch` and `codefetch-sdk`)
- Push commit and tags to remote
- **Create a GitHub Release** with notes extracted from `CHANGELOG.md`

## Sanity Checks (optional but recommended)

Build and pack locally:
```bash
pnpm build
pnpm --filter codefetch pack
pnpm --filter codefetch-sdk pack
```

Verify after publish:
- npm pages render correctly for both `codefetch` and `codefetch-sdk`
- Git tag `vX.Y.Z` exists
- GitHub Release exists with changelog notes
- Both packages are published to npm with correct versions

## Release Notes Tips

- The script automatically extracts release notes from `CHANGELOG.md`
- Make sure to update `CHANGELOG.md` before running the release script
- The release notes will include all items under the version heading (e.g., `## 2.0.4`)

## Prereleases / Dist-Tags

To ship a prerelease:
```bash
pnpm tsx scripts/release-fix-workspace.ts patch --alpha
```

This creates an alpha version (e.g., `2.0.3-alpha.0`) and publishes with the `alpha` tag.

## Rollback / Deprecation

Prefer deprecation over unpublish:
```bash
npm deprecate codefetch@X.Y.Z "Reason…"
npm deprecate codefetch-sdk@X.Y.Z "Reason…"
```

Only unpublish if necessary and allowed (within 72 hours):
```bash
npm unpublish codefetch@X.Y.Z --force
npm unpublish codefetch-sdk@X.Y.Z --force
```

Delete the GitHub Release if needed: `gh release delete vX.Y.Z`

## Troubleshooting

- `npm ERR! code E403` or auth failures: run `npm login` and retry
- `gh` failures: `gh auth status`; ensure `repo` scope exists
- Tag push rejected: pull/rebase or fast-forward `main`, then rerun

## Release Frequency Suggestions

- **Patch releases** (bug fixes): As needed
- **Minor releases** (features): Weekly or bi-weekly  
- **Major releases** (breaking): Planned milestones
