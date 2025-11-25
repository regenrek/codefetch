# Pre-Release Checklist

This document outlines the **mandatory steps** that must pass before any release. If any step fails, the release process must **STOP** until the issue is resolved.

## PR vs Release

**Not every PR is a release.** The typical workflow is:

1. **PRs** → Merge features/fixes to `main` (run mandatory checks below)
2. **Accumulate** → Multiple PRs can be merged before a release
3. **Release** → When ready, bump versions and publish to npm

**When to release:**
- After significant features or bug fixes
- Before announcing to users
- When breaking changes need to be shipped
- Periodic releases (e.g., weekly/monthly)

## Mandatory Checks (Before Merging ANY PR)

### 1. Linting ✅

All code must pass linting without errors.

```bash
pnpm lint
```

**Criteria**: Zero errors. Warnings are acceptable but should be minimized.

### 2. Type Checking ✅

TypeScript must compile without errors.

```bash
pnpm -C packages/sdk build
pnpm -C packages/cli build
```

**Criteria**: Build completes successfully with no TypeScript errors.

### 3. Tests ✅

All tests must pass.

```bash
pnpm test
```

**Criteria**: 100% of tests pass (skipped tests are acceptable if documented).

### 4. Code Coverage 📊

Minimum coverage thresholds must be met.

```bash
pnpm test
```

**Criteria**:
| Package | Minimum Statements | Minimum Branches |
|---------|-------------------|------------------|
| SDK     | 70%               | 70%              |
| CLI     | 75%               | 60%              |

> **Note**: Some areas have lower coverage due to:
> - Entry points (`cli.ts`) that are hard to unit test
> - Worker-specific code (`src/web/`) requiring special environments
> - External dependencies (git, tarball parsing)
>
> Target 80%+ for core business logic.

### 5. Changelog Updated 📝

All changes must be documented in the appropriate CHANGELOG files:
- `/CHANGELOG.md` (root - user-facing)
- `/packages/cli/CHANGELOG.md`
- `/packages/sdk/CHANGELOG.md`

**Criteria**: New version section exists with all changes documented.

### 6. Version Bump 🔢

Package versions must be updated:
- `package.json` (root)
- `packages/cli/package.json`
- `packages/sdk/package.json`

**Criteria**: Version numbers are consistent and follow semver.

## Pre-Release Command

Run all checks at once:

```bash
# Full validation
pnpm test

# Check coverage specifically
pnpm test 2>&1 | grep -E "(% Stmts|All files)"
```

## Release Blockers

The following issues will **block a release**:

1. ❌ Any linting errors
2. ❌ Any TypeScript compilation errors
3. ❌ Any failing tests
4. ❌ Coverage below thresholds
5. ❌ Missing changelog entries
6. ❌ Inconsistent version numbers

## After All Checks Pass (For PRs)

1. Commit all changes
2. Push to feature branch
3. Create PR to main
4. Merge after review

## When Ready to Release to npm

Only when you decide it's time for a new npm release:

```bash
# 1. Ensure you're on main with latest changes
git checkout main && git pull

# 2. Bump versions (updates package.json files)
pnpm run release

# 3. The release script will:
#    - Update version numbers
#    - Create git tag
#    - Push to origin
#    - Publish to npm
```

**Release frequency suggestions:**
- Patch releases (bug fixes): As needed
- Minor releases (features): Weekly or bi-weekly
- Major releases (breaking): Planned milestones
