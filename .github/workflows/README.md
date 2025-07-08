# GitHub Actions Workflows

This directory contains CI/CD workflows for the Codefetch project.

## SDK Workflows

### sdk-test.yml
Main test workflow for the SDK package that runs on:
- Push to main/develop branches
- Pull requests to main/develop branches

**Features:**
- Matrix testing across OS (Ubuntu, macOS, Windows) and Node versions (18, 20, 22)
- Linting with ESLint
- Type checking with TypeScript
- Unit tests with coverage reporting
- Build validation for both main SDK and worker builds
- Coverage upload to Codecov

### sdk-pr.yml
Lightweight PR checks that run on all SDK-related pull requests.

**Features:**
- Quick validation (lint, type check, test, build)
- Runs only on Ubuntu with Node 20
- Comments PR with test results summary
- Faster feedback for contributors

## Workflow Configuration

All SDK workflows are triggered only when changes are made to:
- `packages/sdk/**` - SDK source and test files
- `.github/workflows/sdk-*.yml` - Workflow files themselves
- `pnpm-lock.yaml` - Dependencies

This ensures CI runs only when relevant changes are made.