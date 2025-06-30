# Refactor to Monorepo Plan

This document outlines the plan to refactor the `codefetch` project into a pnpm monorepo structure, similar to the `@/nowledge` project. The new structure will consist of `cli`, `sdk`, and `mcp` packages under a `packages` directory.

## Overview

- **Version**: All packages will start at version 1.5.1 (matching the current codefetch release)
- **Package Structure**:
  - `@codefetch/cli`: The command-line interface that imports SDK functions (uses citty for CLI framework)
  - `@codefetch/sdk`: Core functionality exposed programmatically (e.g., `import { exportFiles, generateMarkdown } from '@codefetch/sdk'`)
  - `@codefetch/mcp`: Model Context Protocol server implementation (depends on SDK for all tool functions)
- **No Breaking Changes**: 
  - CLI remains accessible via `npm install -g codefetch` (global install)
  - SDK available via `npm install @codefetch/sdk` (for programmatic use)
- **Build System**: 
  - Pure pnpm workspace (no turbo/nx)
  - Unbuild for all packages
  - ESM output format only
- **Exports**: Barrel exports pattern for all packages
- **Testing**: Each package has its own test directory, maintaining current CLI test coverage (~80%)
- **Development**: Workspace protocol only (`workspace:*`), no `pnpm link`
- **Publishing**: Manual publishing (not automated)
- **Migration**: One large refactor (not incremental)

## Phase 1: Initial Monorepo Setup

1.  **Create `pnpm-workspace.yaml`**: In the root of the `codefetch` project, create a `pnpm-workspace.yaml` file to define the location of the packages.

    ```yaml
    packages:
      - 'packages/*'
    ```

2.  **Create `packages` Directory**: Create a new `packages` directory in the project root. This will house all the individual packages of the monorepo.

3.  **Move Existing Code to `packages/cli`**:
    *   Create a `packages/cli` directory.
    *   Move the existing `src` and `test` directories into `packages/cli`.
    *   Create a `package.json` for the `cli` package with:
        - `"name": "@codefetch/cli"`
        - `"version": "1.5.1"`
        - Dependencies and scripts specific to the CLI
    *   Move configuration files like `tsconfig.json` and `vitest.config.ts` into `packages/cli`.

4.  **Update Root `package.json`**:
    *   Modify the root `package.json` to manage the workspace.
    *   Set `"private": true`.
    *   Keep workspace-wide development dependencies.
    *   Add scripts to run commands across all packages:
        - `"build": "pnpm -r build"` - Build all packages
        - `"test": "pnpm -r test"` - Test all packages
        - `"cli": "pnpm --filter @codefetch/cli run cli"` - Run the CLI

## Phase 2: Create `sdk` and `mcp` Packages

1.  **Create `packages/sdk`**:
    *   Create the directory `packages/sdk`.
    *   Initialize a `package.json` for `@codefetch/sdk` with version `1.5.1`.
    *   This package will expose core CLI functionality programmatically:
        - `exportFiles` function
        - `generateMarkdown` function
        - Configuration management
        - File handling utilities
        - Token counting logic
    *   Set up barrel exports (index.ts) to expose these functions

2.  **Create `packages/mcp`**:
    *   Create the directory `packages/mcp`.
    *   Initialize a `package.json` for `@codefetch/mcp` with version `1.5.1`.
    *   Move `server.ts` and all Model Context Protocol server-related code here
    *   This package implements the MCP server functionality

## Phase 3: Configuration and Tooling

1.  **TypeScript Configuration**:
    *   Create a `tsconfig.base.json` in the root for shared TypeScript settings.
    *   Each package will have its own `tsconfig.json` that extends the base configuration. This allows for package-specific settings and path aliases for inter-package dependencies.

2.  **Build System**:
    *   Configure `unbuild` for each package to compile TypeScript to JavaScript (ESM format only).
    *   Each package gets its own `build.config.ts` for unbuild configuration.
    *   Ensure the root `package.json` can build all packages using pnpm's built-in topological sorting.
    *   Keep existing CI/CD pipeline and changelog generation as-is.

3.  **Testing**:
    *   Each package will have its own `test` directory.
    *   Maintain current CLI test coverage (~80%).
    *   For new code, write minimal tests (max 3) focusing on smoke tests for most critical functionality.
    *   Adjust the Vitest configuration to support the monorepo structure, allowing tests to be run from the root or within each package.

## Phase 4: Code Refactoring and Migration

1.  **Identify and Move Shared Logic**:
    *   Analyze the code in `packages/cli/src` to identify core, reusable logic.
    *   Move to `packages/sdk/src`:
        - File handling functions (from file.ts)
        - Markdown generation (from markdown.ts)
        - Token counting logic (from token.ts)
        - Configuration management (from config.ts)
        - Export functionality (from export.ts)
        - Shared utilities from utils.ts (keep CLI-specific formatting in CLI)
        - Type definitions that are shared between packages
    *   Keep in `packages/cli/src`:
        - CLI-specific utilities (terminal formatting, spinners, etc.)
        - Citty command definitions and CLI entry point
        - CLI-specific configuration
    *   Move to `packages/mcp/src`:
        - server.ts and all MCP-related code
    *   Create barrel exports (index.ts) in each package
    *   Use minimal TypeScript path aliases (maximum one if needed)

2.  **Integrate SDK**:
    *   Add `@codefetch/sdk` as a dependency to `packages/cli` using `pnpm add @codefetch/sdk@workspace:*`.
    *   Add `@codefetch/sdk` as a dependency to `packages/mcp` using `pnpm add @codefetch/sdk@workspace:*`.
    *   Update the `cli` package to import shared functionality: 
        ```typescript
        import { exportFiles, generateMarkdown } from '@codefetch/sdk'
        ```
    *   Update the `mcp` package to import SDK functions for tool implementations
    *   Ensure the CLI remains the entry point, using SDK functions internally

3.  **Package Publishing**:
    *   `codefetch` - Main CLI package published to npm (global install: `npm install -g codefetch`)
    *   `@codefetch/sdk` - Published to npm for programmatic use (`npm install @codefetch/sdk`)
    *   `@codefetch/mcp` - Published to npm for MCP server functionality

4.  **Dependency Management**:
    *   Shared dependencies (like `glob`, `chalk`, etc.) should be installed where they're used
    *   Avoid peer dependencies - bundle what's needed in each package
    *   Types can live in SDK or locally in each package as needed

## Phase 5: Implementation Details

1.  **Package.json Structure**:
    *   CLI package name: `"name": "codefetch"` (not @codefetch/cli, to maintain npm install -g codefetch)
    *   SDK package name: `"name": "@codefetch/sdk"`
    *   MCP package name: `"name": "@codefetch/mcp"`

2.  **Development Commands**:
    *   Each package should have:
        - `"build": "unbuild"` - Build the package
        - `"test": "vitest"` - Run tests
    *   CLI package additionally has:
        - `"cli": "node ./dist/cli.mjs"` - Run the CLI locally

3.  **Import Updates**:
    *   Replace relative imports between moved files with package imports
    *   Example: `import { generateMarkdown } from '../markdown'` becomes `import { generateMarkdown } from '@codefetch/sdk'`

4.  **File Structure After Migration**:
    ```
    codefetch/
    ├── packages/
    │   ├── cli/
    │   │   ├── src/
    │   │   │   ├── cli.ts (entry point with citty)
    │   │   │   └── utils/ (CLI-specific utilities)
    │   │   ├── test/
    │   │   ├── package.json
    │   │   ├── tsconfig.json
    │   │   └── build.config.ts
    │   ├── sdk/
    │   │   ├── src/
    │   │   │   ├── index.ts (barrel exports)
    │   │   │   ├── markdown.ts
    │   │   │   ├── file.ts
    │   │   │   ├── token.ts
    │   │   │   ├── config.ts
    │   │   │   └── export.ts
    │   │   ├── test/
    │   │   ├── package.json
    │   │   ├── tsconfig.json
    │   │   └── build.config.ts
    │   └── mcp/
    │       ├── src/
    │       │   ├── index.ts
    │       │   └── server.ts
    │       ├── test/
    │       ├── package.json
    │       ├── tsconfig.json
    │       └── build.config.ts
    ├── pnpm-workspace.yaml
    ├── package.json (root, private: true)
    └── tsconfig.base.json
    ```

By following this plan, `codefetch` will be transformed into a scalable and maintainable monorepo, which will facilitate future development and code sharing while maintaining backward compatibility. 