# How To Release codefetch

This project ships via the Node script at `scripts/release-fix-workspace.ts`. The script bumps versions, builds, publishes to npm, pushes tags, and creates a GitHub Release with notes from `CHANGELOG.md`.

## Prerequisites
- Node 18+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate` works too)
- GitHub CLI (`gh auth status` shows logged in)
- npm auth: `npm whoami` works; 2FA ready if enabled
- Clean `main` branch pushed to origin

## Prepare
- Update `CHANGELOG.md` with a new section (e.g., `## [0.1.4] - YYYY-MM-DD`).
- Ensure any user-facing docs (README, templates) are committed.

## Quick Release
- Patch/minor/major bump and publish:
  - `pnpm tsx scripts/release-fix-workspace.ts patch` (or `minor`/`major`)
- The script will:
  - Build all packages sequentially (SDK first, then CLI and MCP)
  - Bump versions in `packages/cli/package.json` and `packages/sdk/package.json`
  - Replace workspace dependencies with actual versions
  - Create git commit `chore: release vX.Y.Z` and tag `vX.Y.Z`
  - Publish packages to npm (`codefetch` and `codefetch-sdk`)
  - Push commit and tags to remote
  - **Create a GitHub Release** with notes extracted from `CHANGELOG.md` for the current version

## Sanity Checks (optional but recommended)
- Build and pack locally:
  - `pnpm build` (builds all packages)
  - `pnpm --filter codefetch pack` (test CLI package)
  - `pnpm --filter codefetch-sdk pack` (test SDK package)
- Verify after publish:
  - npm pages render correctly for both `codefetch` and `codefetch-sdk`
  - Git tag `vX.Y.Z` exists
  - GitHub Release exists with changelog notes
  - Both packages are published to npm with correct versions

## Release Notes Tips
- The script automatically extracts release notes from `CHANGELOG.md` for the current version.
- The GitHub Release is created with the changelog content for the version being released.
- Make sure to update `CHANGELOG.md` before running the release script.
- The release notes will include all items under the version heading (e.g., `## 2.0.2`).

## Prereleases / Dist-Tags
- To ship a prerelease, use the `--alpha` flag:
  - `pnpm tsx scripts/release-fix-workspace.ts patch --alpha`
- This will create an alpha version (e.g., `2.0.3-alpha.0`) and publish with the `alpha` tag.
- The GitHub Release will be marked as a prerelease.

## Rollback / Deprecation
- Prefer deprecation over unpublish:
  - `npm deprecate codefetch@X.Y.Z "Reason…"`
  - `npm deprecate codefetch-sdk@X.Y.Z "Reason…"`
- Only unpublish if necessary and allowed (within 72 hours):
  - `npm unpublish codefetch@X.Y.Z --force`
  - `npm unpublish codefetch-sdk@X.Y.Z --force`
- Create a follow-up patch release that fixes the issue.
- Delete the GitHub Release if needed: `gh release delete vX.Y.Z`

## Troubleshooting
- `npm ERR! code E403` or auth failures: run `npm login` and retry.
- `gh` failures: `gh auth status`; ensure `repo` scope exists.
- Tag push rejected: pull/rebase or fast-forward `main`, then rerun.

