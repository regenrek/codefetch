```
Project Structure:
├── LICENSE
├── README.md
├── build.config.ts
├── codefetch
│   └── code2.md
├── dist
│   ├── index.cjs
│   ├── index.d.cts
│   ├── index.d.mts
│   ├── index.d.ts
│   └── index.mjs
├── eslint.config.mjs
├── package.json
├── pnpm-lock.yaml
├── public
│   └── cover.png
├── src
│   ├── args.ts
│   ├── default-ignore.ts
│   ├── files.ts
│   ├── index.ts
│   ├── markdown.ts
│   └── types.ts
├── test
│   ├── _setup.ts
├── tsconfig.json
└── vitest.config.ts
```

build.config.ts
```
1 | import { defineBuildConfig } from "unbuild";
2 | 
3 | export default defineBuildConfig({
4 |   declaration: true,
5 |   rollup: {
6 |     esbuild: {
7 |       target: "ES2022",
8 |       tsconfigRaw: {
9 |         compilerOptions: {
10 |           useDefineForClassFields: false,
11 |         },
12 |       },
13 |     },
14 |   },
15 | });
```

src/args.ts
```
1 | import type { ParsedArgs } from "./types";
2 | import minimist from "minimist";
3 | 
4 | export function printHelp() {
5 |   console.log(`
6 | Usage: codefetch [options]
7 | 
8 | Options:
9 |   -o, --output <file>         Specify output filename
10 |   --max-tokens <n>            Limit output tokens (useful for AI models)
11 |   -e, --extension <ext,...>   Filter by file extensions (e.g., .ts,.js)
12 |   --include-files <p,...>     Include specific files (supports patterns)
13 |   --exclude-files <p,...>     Exclude specific files (supports patterns)
14 |   --include-dir <d,...>       Include specific directories
15 |   --exclude-dir <d,...>       Exclude specific directories
```

src/default-ignore.ts
```
```

src/files.ts
```
1 | import fs from "node:fs";
```

