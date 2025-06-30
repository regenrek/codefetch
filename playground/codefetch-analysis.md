You are analyzing a codebase. Please provide:
1. Overview of the project structure
2. Main technologies used
3. Key features identified

Project: Codefetch
Repository: https://github.com/regenrek/codefetch/

Project Structure:
├── CHANGELOG.md
├── LICENSE
├── README.md
├── codefetch.config.mjs
├── eslint.config.mjs
├── modeldb.json
├── package.json
├── pnpm-lock.yaml
├── public
│   ├── cover.jpeg
│   └── tokenlimiter.png
├── scripts
│   └── release.ts
├── src
│   ├── args.ts
│   ├── cli.ts
│   ├── commands
│   │   ├── default.ts
│   │   └── init.ts
│   ├── config.ts
│   ├── constants.ts
│   ├── default-ignore.ts
│   ├── files.ts
│   ├── help-prompt.ts
│   ├── index.ts
│   ├── markdown.ts
│   ├── model-db.ts
│   ├── prompts
│   │   ├── codegen.ts
│   │   ├── fix.ts
│   │   ├── improve.ts
│   │   └── testgen.ts
│   ├── template-parser.ts
│   ├── token-counter.ts
│   ├── tree.ts
│   ├── types.ts
│   └── utils.ts
├── test
│   ├── _setup.ts
│   ├── fixtures
│   ├── integration
│   │   ├── codebase-fixture.test.ts
│   │   ├── init.test.ts
│   │   └── prompt-fixture.test.ts
│   ├── regression
│   │   └── regression.test.ts
│   └── unit
│       ├── args.test.ts
│       ├── files.test.ts
│       ├── markdown.test.ts
│       └── token-counter.test.ts
├── tsconfig.json
└── vitest.config.ts


modeldb.json
```
1 | {
2 |   "o3": {
3 |     "max_tokens": 100000,
4 |     "max_input_tokens": 200000,
5 |     "max_output_tokens": 100000,
6 |     "input_cost_per_token": 0.00001,
7 |     "output_cost_per_token": 0.00004,
8 |     "litellm_provider": "openai",
9 |     "mode": "chat",
10 |     "supports_function_calling": true,
11 |     "supports_parallel_function_calling": true,
12 |     "supports_vision": true,
13 |     "supports_response_schema": true,
14 |     "supports_system_messages": true
15 |   },
16 |   "gemini-2.5-pro": {
17 |     "max_tokens": 65535,
[TRUNCATED]
```

package.json
```
1 | {
2 |   "name": "codefetch",
3 |   "version": "1.5.1",
4 |   "description": "Fetches all files in the current directory and outputs them in a Markdown file.",
5 |   "repository": "regenrek/codefetch",
6 |   "license": "MIT",
7 |   "type": "module",
8 |   "sideEffects": false,
9 |   "exports": {
10 |     "./package.json": "./package.json",
11 |     ".": {
12 |       "import": {
13 |         "types": "./dist/index.d.mts",
14 |         "default": "./dist/index.mjs"
15 |       },
16 |       "require": {
17 |         "types": "./dist/index.d.cts",
18 |         "default": "./dist/index.cjs"
19 |       }
20 |     }
21 |   },
[TRUNCATED]
```

tsconfig.json
```
1 | {
2 |   "compilerOptions": {
3 |     "target": "ESNext",
4 |     "module": "preserve",
5 |     "moduleDetection": "force",
6 |     "esModuleInterop": true,
7 |     "allowSyntheticDefaultImports": true,
8 |     "allowJs": true,
9 |     "resolveJsonModule": true,
10 |     "strict": true,
11 |     "isolatedModules": true,
12 |     "verbatimModuleSyntax": true,
13 |     "forceConsistentCasingInFileNames": true,
14 |     "noImplicitOverride": true,
15 |     "noEmit": true,
16 |     "skipLibCheck": true,
17 |     "lib": ["ESNext"]
18 |   },
19 |   "include": [
20 |     "src/**/*",
21 |     "test/**/*"
22 |   ]
23 | } 
```

vitest.config.ts
```
1 | import { defineConfig } from "vitest/config";
2 | 
3 | export default defineConfig({
4 |   test: {
5 |     globals: true,
6 |     environment: "node",
7 |     setupFiles: ["./test/_setup.ts"],
8 |     coverage: {
9 |       provider: "v8",
10 |       reporter: ["text", "json", "html"],
11 |       exclude: ["**/node_modules/**", "**/dist/**", "**/test/**", "**/docs/**"],
12 |     },
13 |   },
14 | });
```

scripts/release.ts
```
1 | #!/usr/bin/env tsx
2 | /**
3 |  * Release Script
4 |  *
5 |  * This script automates the process of creating and publishing releases
6 |  * for the current package.
7 |  *
8 |  * Usage:
9 |  *   pnpm tsx scripts/release.ts [version-type] [--alpha] [--no-git]
10 |  *
11 |  * version-type: 'major', 'minor', 'patch', or specific version (default: 'patch')
12 |  * --alpha: Create an alpha release
13 |  * --no-git: Skip git commit and tag
14 |  */
15 | 
16 | import { execSync } from "node:child_process";
17 | import fs from "node:fs";
18 | import path from "node:path";
19 | 
20 | // Parse command line arguments
21 | const args = process.argv.slice(2);
[TRUNCATED]
```

test/_setup.ts
```
1 | export { afterEach, describe, it, expect, vi } from "vitest";
2 | import { consola } from "consola";
3 | import { beforeAll, beforeEach, vi } from "vitest";
4 | 
5 | beforeAll(() => {
6 |   // if we enabled this stdout is empty and console.log fail
7 |   // Not sure how to mock the consola - docs aren't helping here.
8 |   // would be much easier...
9 |   //consola.wrapAll();
10 | });
11 | 
12 | beforeEach(() => {
13 |   consola.mockTypes(() => vi.fn());
14 | });
```

src/args.ts
```
1 | import mri from "mri";
2 | import { resolve } from "pathe";
3 | import type { TokenEncoder, TokenLimiter } from "./types";
4 | import { VALID_PROMPTS, VALID_ENCODERS, VALID_LIMITERS } from "./constants";
5 | 
6 | export function parseArgs(args: string[]) {
7 |   const argv = mri(args, {
8 |     alias: {
9 |       o: "output",
10 |       e: "extension",
11 |       v: "verbose",
12 |       t: "project-tree",
13 |       d: "dry-run",
14 |       p: "prompt",
15 |       c: "token-count-only",
16 |     },
17 |     boolean: ["dry-run", "disable-line-numbers", "token-count-only"],
18 |     string: [
19 |       "output",
[TRUNCATED]
```

src/cli.ts
```
1 | #!/usr/bin/env node
2 | import consola from "consola";
3 | import mri from "mri";
4 | 
5 | // Define proper types for subCommands and their return values
6 | type CommandModule = {
7 |   default: (args: any) => Promise<void>;
8 | };
9 | 
10 | const subCommands: Record<string, () => Promise<CommandModule>> = {
11 |   _default: () => import("./commands/default"),
12 |   init: () => import("./commands/init"),
13 | };
14 | 
15 | async function main() {
16 |   const args = process.argv.slice(2);
17 |   let subCommand = args[0];
18 |   if (!subCommand || subCommand.startsWith("-")) {
19 |     subCommand = "_default";
20 |   } else {
21 |     args.shift();
22 |   }
23 | 
[TRUNCATED]
```

src/config.ts
```
1 | import { loadConfig } from "c12";
2 | import { resolve } from "pathe";
3 | import type { TokenEncoder, TokenLimiter } from "./types";
4 | import { defu } from "defu";
5 | 
6 | export interface CodefetchConfig {
7 |   outputFile: string;
8 |   outputPath: string;
9 |   maxTokens: number;
10 |   includeFiles?: string[];
11 |   excludeFiles?: string[];
12 |   includeDirs?: string[];
13 |   excludeDirs?: string[];
14 |   verbose: number;
15 |   extensions?: string[];
16 |   defaultIgnore: boolean;
17 |   gitignore: boolean;
18 |   projectTree: number;
19 |   tokenEncoder: TokenEncoder;
20 |   tokenLimiter: TokenLimiter;
21 |   trackedModels?: string[];
22 |   dryRun?: boolean;
23 |   disableLineNumbers?: boolean;
[TRUNCATED]
```

src/constants.ts
```
1 | export const VALID_PROMPTS = new Set([
2 |   "default",
3 |   "fix",
4 |   "improve",
5 |   "testgen",
6 |   "codegen",
7 | ]);
8 | 
9 | export const VALID_ENCODERS = new Set(["simple", "p50k", "o200k", "cl100k"]);
10 | 
11 | export const VALID_LIMITERS = new Set(["sequential", "truncated"]);
```

src/default-ignore.ts
```
1 | export const DEFAULT_IGNORE_PATTERNS = `
2 | # avoid recursion
3 | codefetch/
4 | 
5 | # Git
6 | .git/**
7 | **/.git/**
8 | .gitignore
9 | .gitattributes
10 | 
11 | # Version Control
12 | .git/
13 | .gitignore
14 | .gitattributes
15 | .svn/
16 | .hg/
17 | 
18 | # Package Manager Files
19 | package-lock.json
20 | yarn.lock
21 | pnpm-lock.yaml
22 | bun.lockb
23 | .npmrc
24 | .yarnrc
25 | .pnpmrc
26 | .npmignore
27 | 
28 | # Project Config
29 | .codefetchignore
30 | .editorconfig
31 | .eslintrc*
32 | .eslintcache
33 | .prettierrc*
34 | .stylelintrc*
35 | .tsbuildinfo
[TRUNCATED]
```

src/files.ts
```
1 | import path from "pathe";
2 | import fg from "fast-glob";
3 | 
4 | // Helper function to escape special glob characters in paths
5 | function escapeGlobPath(str: string): string {
6 |   // Escape special glob characters: * ? [ ] { } ( ) ! @ + |
7 |   return str.replace(/[*?[\]{}()!@+|]/g, (match) => "\\" + match);
8 | }
9 | 
10 | export async function collectFiles(
11 |   baseDir: string,
12 |   options: {
13 |     ig: any;
14 |     extensionSet: Set<string> | null;
15 |     excludeFiles: string[] | null;
16 |     includeFiles: string[] | null;
17 |     excludeDirs: string[] | null;
18 |     includeDirs: string[] | null;
19 |     verbose: number;
20 |   }
[TRUNCATED]
```

src/help-prompt.ts
```
1 | export function printHelp() {
2 |   console.log(`
3 | Usage: codefetch [command] [options]
4 | 
5 | Commands:
6 |   init                        Initialize a new codefetch project
7 | Options:
8 |   -o, --output <file>         Specify output filename (defaults to codebase.md)
9 |   --dir <path>                Specify the directory to scan (defaults to current directory)
10 |   --max-tokens <number>       Limit output tokens (default: 500,000)
11 |   -e, --extension <ext,...>   Filter by file extensions (e.g., .ts,.js)
12 |   --include-files <p,...>     Include specific files (supports patterns like *.ts)
13 |   --exclude-files <p,...>     Exclude specific files (supports patterns like *.test.ts)
[TRUNCATED]
```

src/index.ts
```
1 | export * from "./markdown";
2 | export * from "./files";
3 | export * from "./default-ignore";
4 | export * from "./utils";
5 | export * from "./args";
6 | export * from "./config";
7 | export * from "./token-counter";
8 | export * from "./model-db";
9 | export * from "./template-parser";
10 | export * from "./help-prompt";
11 | export * from "./constants";
12 | export type { CodefetchConfig } from "./config";
13 | export type { TokenEncoder, TokenLimiter } from "./types";
14 | export type { ModelInfo, ModelDb } from "./model-db";
```

src/markdown.ts
```
1 | import { createReadStream } from "node:fs";
2 | import { relative } from "pathe";
3 | import type { TokenEncoder, TokenLimiter } from "./types";
4 | import { generateProjectTree } from "./tree";
5 | import { countTokens } from "./token-counter";
6 | import consola from "consola";
7 | import { processPromptTemplate, resolvePrompt } from "./template-parser";
8 | 
9 | const CHUNK_SIZE = 64 * 1024; // 64KB optimal chunk size
10 | 
11 | function logVerbose(message: string, level: number, currentVerbosity: number) {
12 |   if (currentVerbosity >= level) {
13 |     consola.log(message);
14 |   }
15 | }
16 | 
17 | async function readFileWithTokenLimit(
18 |   file: string,
19 |   tokenEncoder: TokenEncoder,
[TRUNCATED]
```

src/model-db.ts
```
1 | const MODELDB_URL =
2 |   "https://raw.githubusercontent.com/regenrek/codefetch/main/modeldb.json";
3 | 
4 | export interface ModelInfo {
5 |   max_tokens: number;
6 |   max_input_tokens: number;
7 |   max_output_tokens: number;
8 |   litellm_provider: string;
9 | }
10 | 
11 | export interface ModelDb {
12 |   [key: string]: ModelInfo;
13 | }
14 | 
15 | export async function getLocalModels(): Promise<ModelDb> {
16 |   return {
17 |     o3: {
18 |       max_tokens: 100_000,
19 |       max_input_tokens: 200_000,
20 |       max_output_tokens: 100_000,
21 |       litellm_provider: "openai",
[TRUNCATED]
```

src/template-parser.ts
```
1 | import { resolve } from "pathe";
2 | import { existsSync } from "node:fs";
3 | import { readFile } from "node:fs/promises";
4 | import { VALID_PROMPTS } from "./constants";
5 | 
6 | // Update the PromptModule type to match the actual structure
7 | type PromptModule = {
8 |   default: string;
9 | };
10 | 
11 | const builtInPrompts: Record<string, () => Promise<PromptModule>> = {
12 |   fix: () => import("./prompts/fix"),
13 |   improve: () => import("./prompts/improve"),
14 |   codegen: () => import("./prompts/codegen"),
15 |   testgen: () => import("./prompts/testgen"),
16 | };
17 | 
18 | export async function processPromptTemplate(
19 |   template: string,
[TRUNCATED]
```

src/tree.ts
```
1 | import fs from "node:fs";
2 | import { join, basename } from "pathe";
3 | 
4 | function generateTree(
5 |   dir: string,
6 |   level: number,
7 |   prefix = "",
8 |   isLast = true,
9 |   maxLevel = 2,
10 |   currentLevel = 0
11 | ): string {
12 |   if (currentLevel >= maxLevel) return "";
13 | 
14 |   let tree =
15 |     currentLevel === 0
16 |       ? ""
17 |       : `${prefix}${isLast ? "└── " : "├── "}${basename(dir)}\n`;
18 | 
19 |   const files = fs.readdirSync(dir);
20 |   const filteredFiles = files.filter(
21 |     (file) => !file.startsWith(".") && file !== "node_modules"
22 |   );
23 | 
[TRUNCATED]
```

src/types.ts
```
1 | export type TokenEncoder = "simple" | "p50k" | "o200k" | "cl100k";
2 | export type TokenLimiter = "sequential" | "truncated";
```

src/utils.ts
```
1 | import { existsSync } from "node:fs";
2 | import { parse, join, dirname } from "pathe";
3 | 
4 | export const findProjectRoot = (startDir: string): string => {
5 |   let currentDir = startDir;
6 |   while (currentDir !== parse(currentDir).root) {
7 |     if (existsSync(join(currentDir, "package.json"))) {
8 |       return currentDir;
9 |     }
10 |     currentDir = dirname(currentDir);
11 |   }
12 |   return startDir;
13 | };
```

test/integration/codebase-fixture.test.ts
```
1 | import { describe, it, beforeEach, afterEach, expect } from "vitest";
2 | import { spawnSync } from "node:child_process";
3 | import fs from "node:fs";
4 | import { resolve, join } from "pathe";
5 | 
6 | const cliPath = resolve(__dirname, "../../dist/cli.mjs");
7 | const FIXTURE_DIR = resolve(__dirname, "../fixtures/codebase-test");
8 | const CODEFETCH_DIR = join(FIXTURE_DIR, "codefetch");
9 | 
10 | describe("Integration: codebase-test fixture", () => {
11 |   beforeEach(() => {
12 |     if (fs.existsSync(CODEFETCH_DIR)) {
13 |       fs.rmSync(CODEFETCH_DIR, { recursive: true, force: true });
[TRUNCATED]
```

test/integration/init.test.ts
```
1 | import { describe, it, beforeEach, afterEach, expect } from "vitest";
2 | import { spawnSync } from "node:child_process";
3 | import { readFile } from "node:fs/promises";
4 | import { existsSync } from "node:fs";
5 | import { resolve, join } from "pathe";
6 | 
7 | const cliPath = resolve(__dirname, "../../dist/cli.mjs");
8 | const FIXTURE_DIR = resolve(__dirname, "../fixtures/init-test");
9 | const CODEFETCH_DIR = join(FIXTURE_DIR, "codefetch");
10 | 
11 | describe("Integration: init command", () => {
12 |   beforeEach(async () => {
13 |     // if (existsSync(CODEFETCH_DIR)) {
[TRUNCATED]
```

test/integration/prompt-fixture.test.ts
```
1 | import { describe, it, beforeEach, afterEach, expect } from "vitest";
2 | import { spawnSync } from "node:child_process";
3 | import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
4 | import { existsSync } from "node:fs";
5 | import { resolve, join } from "pathe";
6 | 
7 | const cliPath = resolve(__dirname, "../../dist/cli.mjs");
8 | const FIXTURE_DIR = resolve(__dirname, "../fixtures/prompt-test");
9 | const CODEFETCH_DIR = join(FIXTURE_DIR, "codefetch");
10 | const PROMPTS_DIR = join(CODEFETCH_DIR, "prompts");
11 | 
12 | describe("Integration: prompt functionality", () => {
[TRUNCATED]
```

test/regression/regression.test.ts
```
1 | import { describe, it, expect, beforeEach, afterEach } from "vitest";
2 | import path from "node:path";
3 | import fs from "node:fs";
4 | import { parseArgs, collectFiles, generateMarkdown } from "../../src/index";
5 | import ignore from "ignore";
6 | 
7 | describe("Regression Tests", () => {
8 |   const TEST_DIR = path.join(__dirname, "..", "__regression_fixture__");
9 | 
10 |   beforeEach(() => {
11 |     if (!fs.existsSync(TEST_DIR)) {
12 |       fs.mkdirSync(TEST_DIR, { recursive: true });
13 |     }
14 |     // Create some nested dirs and files of varied extensions
[TRUNCATED]
```

test/unit/args.test.ts
```
1 | import { describe, it, expect } from "vitest";
2 | import { parseArgs } from "../../src/args";
3 | 
4 | describe("parseArgs", () => {
5 |   it("should parse basic arguments", () => {
6 |     const args = ["--output", "output.md", "--verbose", "2"];
7 |     const result = parseArgs(args);
8 | 
9 |     expect(result).toMatchObject({
10 |       outputFile: "output.md",
11 |       verbose: 2,
12 |     });
13 |   });
14 | 
15 |   it("should strip codefetch/ prefix from output file", () => {
16 |     // Test with codefetch/ prefix
17 |     expect(parseArgs(["-o", "codefetch/codebase.md"]).outputFile).toBe(
18 |       "codebase.md"
19 |     );
[TRUNCATED]
```

test/unit/files.test.ts
```
1 | import { describe, it, expect, beforeEach, afterEach } from "vitest";
2 | import fs from "node:fs";
3 | import path from "node:path";
4 | import { collectFiles } from "../../src/index";
5 | import ignore from "ignore";
6 | 
7 | const TEST_DIR = path.join(__dirname, "..", "__test__");
8 | 
9 | describe("collectFiles", () => {
10 |   beforeEach(() => {
11 |     // Create test directory and files
12 |     if (!fs.existsSync(TEST_DIR)) {
13 |       fs.mkdirSync(TEST_DIR, { recursive: true });
14 |     }
15 |     fs.writeFileSync(path.join(TEST_DIR, "test1.ts"), "test content");
[TRUNCATED]
```

test/unit/markdown.test.ts
```
1 | import { describe, it, expect } from "vitest";
2 | import { resolve, join } from "pathe";
3 | import { generateMarkdown } from "../../src/index";
4 | import { countTokens } from "../../src/token-counter";
5 | 
6 | const FIXTURE_DIR = resolve(__dirname, "../fixtures/codebase-test");
7 | const UTILS_DIR = join(FIXTURE_DIR, "src/utils");
8 | 
9 | describe("generateMarkdown with chunk-based token limit", () => {
10 |   it("enforces maxTokens by chunk-based reading", async () => {
11 |     const MAX_TOKENS = 50;
12 |     const files = [join(UTILS_DIR, "test1.ts"), join(UTILS_DIR, "test2.js")];
13 | 
[TRUNCATED]
```

src/commands/default.ts
```
1 | import { existsSync, promises as fsp } from "node:fs";
2 | import type { Argv } from "mri";
3 | import { resolve, join } from "pathe";
4 | import consola from "consola";
5 | import ignore from "ignore";
6 | import {
7 |   printHelp,
8 |   collectFiles,
9 |   generateMarkdown,
10 |   DEFAULT_IGNORE_PATTERNS,
11 |   findProjectRoot,
12 |   parseArgs,
13 |   loadCodefetchConfig,
14 |   countTokens,
15 |   fetchModels,
16 |   VALID_PROMPTS,
17 | } from "..";
18 | import type { TokenEncoder, TokenLimiter } from "../types";
19 | 
20 | export default async function defaultMain(rawArgs: Argv) {
21 |   if (rawArgs.help || rawArgs.h) {
22 |     printHelp();
[TRUNCATED]
```

src/commands/init.ts
```
1 | import { promises as fsp } from "node:fs";
2 | import { join } from "pathe";
3 | import consola from "consola";
4 | import type { CodefetchConfig } from "../config";
5 | 
6 | const createConfigFile = async (
7 |   config: Partial<CodefetchConfig>,
8 |   cwd: string
9 | ) => {
10 |   const configContent = `/** @type {import('codefetch').CodefetchConfig} */
11 | export default ${JSON.stringify(config, null, 2)};
12 | `;
13 | 
14 |   await fsp.writeFile(join(cwd, "codefetch.config.mjs"), configContent);
15 | };
16 | 
17 | const createIgnoreFile = async (cwd: string) => {
18 |   const content = "test/\nvitest.config.ts\n";
[TRUNCATED]
```

src/prompts/codegen.ts
```
1 | export default `You are a senior developer. You produce optimized, maintainable code that follows best practices. 
2 | 
3 | Your task is to write code according to my instructions for the current codebase.
4 | 
5 | instructions:
6 | <message>
7 | {{MESSAGE}}
8 | </message>
9 | 
10 | Rules:
11 | - Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. 
12 | - Your output should be a series of specific, actionable changes.
13 | 
14 | When approaching this task:
15 | 1. Carefully review the provided code.
16 | 2. Identify the area thats raising this issue or error and provide a fix.
17 | 3. Consider best practices for the specific programming language used.
18 | 
19 | For each suggested change, provide:
20 | 1. A short description of the change (one line maximum).
21 | 2. The modified code block.
22 | 
[TRUNCATED]
```

src/prompts/fix.ts
```
1 | export default `You are a senior developer. You produce optimized, maintainable code that follows best practices. 
2 | 
3 | Your task is to review the current codebase and fix the current issues.
4 | 
5 | Current Issue:
6 | <issue>
7 | {{MESSAGE}}
8 | </issue>
9 | 
10 | Rules:
11 | - Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. 
12 | - Your output should be a series of specific, actionable changes.
13 | 
14 | When approaching this task:
15 | 1. Carefully review the provided code.
16 | 2. Identify the area thats raising this issue or error and provide a fix.
17 | 3. Consider best practices for the specific programming language used.
18 | 
19 | For each suggested change, provide:
20 | 1. A short description of the change (one line maximum).
21 | 2. The modified code block.
22 | 
23 | Use the following format for your output:
[TRUNCATED]
```

src/prompts/improve.ts
```
1 | export default `You are a senior software architect. You produce optimized, maintainable code that follows best practices. 
2 | 
3 | Your task is to review the current codebase and suggest improvements or optimizations.
4 | 
5 | Rules:
6 | - Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. 
7 | - Your output should be a series of specific, actionable changes.
8 | 
9 | When approaching this task:
10 | 1. Carefully review the provided code.
11 | 2. Identify areas that could be improved in terms of efficiency, readability, or maintainability.
12 | 3. Consider best practices for the specific programming language used.
13 | 4. Think about potential optimizations that could enhance performance.
14 | 5. Look for opportunities to refactor or restructure the code for better organization.
15 | 
16 | For each suggested change, provide:
17 | 1. A short description of the change (one line maximum).
18 | 2. The modified code block.
[TRUNCATED]
```

src/prompts/testgen.ts
```
1 | export default `You are a senior test developer. You produce optimized, maintainable code that follows best practices. 
2 | 
3 | Your task is to review the current codebase and create and improve missing tests for the codebase.
4 | 
5 | Additional instructions:
6 | <message>
7 | {{MESSAGE}}
8 | </message>
9 | 
10 | Rules:
11 | - Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. 
12 | - Your output should be a series of specific, actionable changes.
13 | 
14 | When approaching this task:
15 | 1. Carefully review the provided code.
16 | 2. Identify the area thats raising this issue or error and provide a fix.
17 | 3. Consider best practices for the specific programming language used.
18 | 
19 | For each suggested change, provide:
20 | 1. A short description of the change (one line maximum).
21 | 2. The modified code block.
22 | 
[TRUNCATED]
```

test/fixtures/codebase-test/package.json
```
1 | {
2 |   "name": "codebase-test",
3 |   "version": "0.0.1",
4 |   "private": true,
5 |   "scripts": {
6 |     "start": "react-scripts start",
7 |     "build": "react-scripts build"
8 |   },
9 |   "dependencies": {
10 |     "react": "19.0.0",
11 |     "react-dom": "19.0.0",
12 |     "react-scripts": "5.0.1"
13 |   }
14 | }
```

test/fixtures/codebase-test/src/app.js
```
1 | import logo from "./logo.svg";
2 | import "./app.css";
3 | 
4 | function App() {
5 |   return (
6 |     <div className="App">
7 |       <header className="App-header">
8 |         <img src={logo} className="App-logo" alt="logo" />
9 |         <p>hi</p>
10 |       </header>
11 |     </div>
12 |   );
13 | }
14 | 
15 | export default App;
```

test/fixtures/codebase-test/src/components/button.js
```
1 | function Button({ onClick, children }) {
2 |   return (
3 |     <button className="button" onClick={onClick}>
4 |       {children}
5 |     </button>
6 |   );
7 | }
8 | 
9 | export default Button;
```

test/fixtures/codebase-test/src/components/header.js
```
1 | function Header({ title }) {
2 |   return (
3 |     <header className="header">
4 |       <h1>{title}</h1>
5 |     </header>
6 |   );
7 | }
8 | 
9 | export default Header;
```

test/fixtures/codebase-test/src/utils/test1.ts
```
1 | console.log("begin-of-file");
2 | 
3 | /**
4 |  * Splits a file into chunks and processes each chunk.
5 |  * @param file - The file to be chunked.
6 |  * @param chunkSize - The size of each chunk in bytes.
7 |  * @param onChunk - Callback for processing each chunk.
8 |  */
9 | function handleFileChunks(
10 |   file: File,
11 |   chunkSize: number,
12 |   onChunk: (chunk: Blob) => void
13 | ): void {
14 |   const fileSize = file.size;
15 |   let offset = 0;
16 | 
17 |   while (offset < fileSize) {
18 |     const chunk = file.slice(offset, offset + chunkSize);
19 |     onChunk(chunk);
20 |     offset += chunkSize;
21 |   }
22 | }
[TRUNCATED]
```

test/fixtures/codebase-test/src/utils/test2.js
```
1 | // fileChunkHandler.js
2 | 
3 | /**
4 |  * Splits a file into chunks and processes each chunk.
5 |  * @param {File} file - The file to be chunked.
6 |  * @param {number} chunkSize - The size of each chunk in bytes.
7 |  * @param {function} onChunk - Callback for processing each chunk.
8 |  */
9 | function handleFileChunks(file, chunkSize, onChunk) {
10 |   const fileSize = file.size;
11 |   let offset = 0;
12 | 
13 |   while (offset < fileSize) {
14 |     const chunk = file.slice(offset, offset + chunkSize);
15 |     onChunk(chunk);
16 |     offset += chunkSize;
17 |   }
18 | }
19 | 
20 | // Example usage:
[TRUNCATED]
```

test/fixtures/codebase-test/src/components/base/container.js
```
1 | function Container({ children }) {
2 |   return <div className="container">{children}</div>;
3 | }
4 | 
5 | export default Container;
```
