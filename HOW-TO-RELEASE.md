# How To Release codex-1up

This project ships via the Node script at `scripts/release.ts`. The script bumps versions, builds, publishes to npm, pushes tags, and creates a GitHub Release with notes from `CHANGELOG.md`.

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
  - `pnpm dlx tsx scripts/release.ts patch` (or `minor`/`major`)
- The script will:
  - Bump `cli/package.json#version`
  - Copy `templates/`, `scripts/`, `sounds/`, `README.md`, `LICENSE` into `cli/` for packaging
  - Build (`tsup`) and publish with `--access public`
  - Clean temporary copies from `cli/`
  - Commit `chore: release vX.Y.Z`, tag `vX.Y.Z`, push
  - Create/Update a GitHub Release with notes from `CHANGELOG.md`

## Sanity Checks (optional but recommended)
- Build and pack locally:
  - `pnpm -C cli build`
  - `pnpm -C cli pack`
  - `tar -tf cli/codex-1up-*.tgz | grep -E 'package/(templates/|sounds/|README.md|LICENSE)'`
- Verify after publish:
  - npm page renders README banner
  - `templates/` and `sounds/` are present in the tarball
  - Git tag `vX.Y.Z` exists and GitHub Release has notes

## Release Notes Tips
- The script extracts notes from `CHANGELOG.md` for the current version.
- If that section is missing, it falls back to the section named by `GH_NOTES_REF` (default: `0.4`).
  - Example: `GH_NOTES_REF=0.1.3 pnpm dlx tsx scripts/release.ts patch`

## Prereleases / Dist-Tags
- To ship a prerelease manually, run the script to tag/commit, then publish with a tag:
  - `pnpm -C cli publish --no-git-checks --tag next`
- Or extend `scripts/release.ts` to accept a `--tag` flag (future enhancement).

## Rollback / Deprecation
- Prefer deprecation over unpublish:
  - `npm deprecate codex-1up@X.Y.Z "Reason…"`
- Only unpublish if necessary and allowed:
  - `npm unpublish codex-1up@X.Y.Z --force`
- Create a follow-up patch release that fixes the issue.

## Troubleshooting
- `npm ERR! code E403` or auth failures: run `npm login` and retry.
- `gh` failures: `gh auth status`; ensure `repo` scope exists.
- Tag push rejected: pull/rebase or fast-forward `main`, then rerun.

