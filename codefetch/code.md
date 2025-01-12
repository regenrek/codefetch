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

codefetch/code.md
```
1 | build.config.ts
2 | ```
3 | 1 | import { defineBuildConfig } from "unbuild";
4 | 2 | 
5 | 3 | export default defineBuildConfig({
6 | 4 |   declaration: true,
7 | 5 |   rollup: {
8 | 6 |     esbuild: {
9 | 7 |       target: "ES2022",
10 | 8 |       tsconfigRaw: {
11 | 9 |         compilerOptions: {
12 | 10 |           useDefineForClassFields: false,
13 | 11 |         },
14 | 12 |       },
15 | 13 |     },
16 | 14 |   },
17 | 15 | });
18 | ```
19 | 
20 | codefetch/code.md
21 | ```
```

eslint.config.mjs
```
1 | import unjs from "eslint-config-unjs";
2 | 
3 | export default unjs(
4 |   {
5 |     ignores: ["**/.nuxt", "**/.output"],
6 |   },
7 |   {
8 |     rules: {
9 |       "unicorn/no-null": "off",
10 |       "unicorn/number-literal-case": "off",
11 |       "@typescript-eslint/no-non-null-assertion": "off",
12 |       "unicorn/expiring-todo-comments": "off",
13 |       "@typescript-eslint/ban-types": "off",
14 |       "unicorn/prefer-export-from": "off",
15 |       "unicorn/prefer-string-raw": "off",
16 |       "unicorn/prefer-code-point": "off",
17 |     },
18 |   },
19 | );
```

package.json
```
1 | {
2 |   "name": "codefetch",
3 |   "version": "1.1.9",
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
22 |   "bin": {
23 |     "codefetch": "./dist/index.mjs"
24 |   },
25 |   "main": "./dist/index.cjs",
26 |   "module": "./dist/index.mjs",
27 |   "types": "./dist/index.d.cts",
28 |   "files": [
29 |     "dist"
30 |   ],
31 |   "scripts": {
32 |     "build": "unbuild",
33 |     "dev": "vitest",
34 |     "lint": "eslint --cache . && prettier -c src test",
35 |     "start": "tsx src/index.ts",
36 |     "lint:fix": "eslint --cache . --fix && prettier -c src test -w",
37 |     "release": "npm test && npm run build && npm publish",
38 |     "test": "npm run lint && npm run test:types && vitest run --coverage",
39 |     "test:types": "tsc --noEmit --skipLibCheck",
40 |     "prepack": "unbuild"
41 |   },
42 |   "devDependencies": {
43 |     "@types/node": "^22.10.5",
44 |     "@vitest/coverage-v8": "^2.1.8",
45 |     "eslint": "^9.18.0",
46 |     "eslint-config-unjs": "^0.4.2",
47 |     "prettier": "^3.4.2",
48 |     "tsx": "^4.19.2",
49 |     "typescript": "^5.7.3",
50 |     "unbuild": "3.2.0",
51 |     "vitest": "^2.1.8"
52 |   },
53 |   "packageManager": "pnpm@9.14.4",
54 |   "dependencies": {
55 |     "ignore": "^7.0.0"
56 |   }
57 | }
```

src/args.ts
```
1 | import type { ParsedArgs } from "./types";
2 | 
3 | export function printHelp() {
4 |   console.log(`
5 | Usage: codefetch [options]
6 | 
7 | Options:
8 |   -o, --output <file>         Specify output filename
9 |   -tok, --max-tokens <n>      Limit output tokens (useful for AI models)
10 |   -e, --extension <ext,...>   Filter by file extensions (e.g., .ts,.js)
11 |   -if, --include-files <p,..> Include specific files (supports patterns)
12 |   -ef, --exclude-files <p,..> Exclude specific files (supports patterns)
13 |   -id, --include-dir <d,...>  Include specific directories
14 |   -ed, --exclude-dir <d,...>  Exclude specific directories
15 |   -t, --project-tree <level>  Generate project tree with specified depth (default: 2)
16 |   -v, --verbose              Show detailed processing information
17 |   -h, --help                 Display this help message
18 | `);
19 | }
20 | 
21 | export function parseArgs(argv: string[]): ParsedArgs {
22 |   const result: ParsedArgs = {
23 |     output: null,
24 |     maxTokens: null,
25 |     extensions: null,
26 |     verbose: false,
27 |     includeFiles: null,
28 |     excludeFiles: null,
29 |     includeDirs: null,
30 |     excludeDirs: null,
31 |     treeLevel: null,
32 |   };
33 | 
34 |   // Skip node and script name if running from CLI
35 |   const args = argv[0]?.endsWith("node") ? argv.slice(2) : argv;
36 | 
37 |   for (let i = 0; i < args.length; i++) {
38 |     const arg = args[i];
39 |     if (arg === "-h" || arg === "--help") {
40 |       printHelp();
41 |       throw new Error("Help message displayed");
42 |     } else if (arg === "-v" || arg === "--verbose") {
43 |       result.verbose = true;
44 |     } else if ((arg === "-t" || arg === "--project-tree") && args[i + 1]) {
45 |       const level = Number.parseInt(args[i + 1], 10);
46 |       if (!Number.isNaN(level)) {
47 |         result.treeLevel = level;
48 |       }
49 |       i++;
50 |     } else if ((arg === "-o" || arg === "--output") && args[i + 1]) {
51 |       result.output = args[i + 1];
52 |       i++;
53 |     } else if ((arg === "--max-tokens" || arg === "-tok") && args[i + 1]) {
54 |       const tokens = Number.parseInt(args[i + 1], 10);
55 |       if (!Number.isNaN(tokens)) {
56 |         result.maxTokens = tokens;
57 |       }
58 |       i++;
59 |     } else if ((arg === "-e" || arg === "--extension") && args[i + 1]) {
60 |       result.extensions = args[i + 1]
61 |         .split(",")
62 |         .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));
63 |       i++;
64 |     } else if ((arg === "-if" || arg === "--include-files") && args[i + 1]) {
65 |       result.includeFiles = args[i + 1].split(",");
66 |       i++;
67 |     } else if ((arg === "-ef" || arg === "--exclude-files") && args[i + 1]) {
68 |       result.excludeFiles = args[i + 1].split(",");
69 |       i++;
70 |     } else if ((arg === "-id" || arg === "--include-dir") && args[i + 1]) {
71 |       result.includeDirs = args[i + 1].split(",");
72 |       i++;
73 |     } else if ((arg === "-ed" || arg === "--exclude-dir") && args[i + 1]) {
74 |       result.excludeDirs = args[i + 1].split(",");
75 |       i++;
76 |     }
77 |   }
78 |   return result;
79 | }
```

src/default-ignore.ts
```
1 | export const DEFAULT_IGNORE_PATTERNS = `
2 | # Git
3 | .git/**
4 | **/.git/**
5 | .gitignore
6 | .gitattributes
7 | 
8 | # Version Control
9 | .git/
10 | .gitignore
11 | .gitattributes
12 | .svn/
13 | .hg/
14 | 
15 | # Package Manager Files
16 | package-lock.json
17 | yarn.lock
18 | pnpm-lock.yaml
19 | bun.lockb
20 | .npmrc
21 | .yarnrc
22 | .pnpmrc
23 | .npmignore
24 | 
25 | # Project Config
26 | .codefetchignore
27 | .editorconfig
28 | .eslintrc*
29 | .eslintcache
30 | .prettierrc*
31 | .stylelintrc*
32 | .tsbuildinfo
33 | .prettierignore
34 | 
35 | # Binary and Image Files
36 | # Images
37 | *.png
38 | *.jpg
39 | *.jpeg
40 | *.gif
41 | *.ico
42 | *.webp
43 | *.bmp
44 | *.tiff
45 | *.tif
46 | *.raw
47 | *.cr2
48 | *.nef
49 | *.heic
50 | *.heif
51 | *.avif
52 | *.svg
53 | *.eps
54 | *.ai
55 | *.psd
56 | *.xcf
57 | 
58 | # Videos
59 | *.mp4
60 | *.mov
61 | *.avi
62 | *.wmv
63 | *.flv
64 | *.mkv
65 | *.webm
66 | *.m4v
67 | *.mpg
68 | *.mpeg
69 | *.3gp
70 | *.3g2
71 | *.ogv
72 | *.vob
73 | 
74 | # Audio
75 | *.mp3
76 | *.wav
77 | *.ogg
78 | *.m4a
79 | *.flac
80 | *.aac
81 | *.wma
82 | *.aiff
83 | *.mid
84 | *.midi
85 | 
86 | # Documents and PDFs
87 | *.pdf
88 | *.doc
89 | *.docx
90 | *.xls
91 | *.xlsx
92 | *.ppt
93 | *.pptx
94 | *.odt
95 | *.ods
96 | *.odp
97 | *.pages
98 | *.numbers
99 | *.key
100 | 
101 | # Archives and Compressed
102 | *.zip
103 | *.tar
104 | *.gz
105 | *.tgz
106 | *.rar
107 | *.7z
108 | *.bz2
109 | *.xz
110 | *.lz
111 | *.lzma
112 | *.lzo
113 | *.rz
114 | *.lz4
115 | *.zst
116 | *.br
117 | *.cab
118 | *.iso
119 | *.dmg
120 | *.img
121 | 
122 | # Binary and Executable
123 | *.exe
124 | *.dll
125 | *.so
126 | *.dylib
127 | *.bin
128 | *.o
129 | *.obj
130 | *.lib
131 | *.a
132 | *.class
133 | *.pyc
134 | *.pyo
135 | *.pyd
136 | *.deb
137 | *.rpm
138 | *.pkg
139 | *.app
140 | *.sys
141 | *.ko
142 | 
143 | # Database and Data Files
144 | *.dat
145 | *.db
146 | *.sqlite
147 | *.sqlite3
148 | *.mdb
149 | *.accdb
150 | *.dbf
151 | *.mdf
152 | *.ldf
153 | *.frm
154 | *.ibd
155 | *.idx
156 | *.dmp
157 | *.bak
158 | *.bson
159 | 
160 | # Font Files
161 | *.ttf
162 | *.otf
163 | *.woff
164 | *.woff2
165 | *.eot
166 | 
167 | # Model and 3D Files
168 | *.fbx
169 | *.obj
170 | *.max
171 | *.blend
172 | *.dae
173 | *.mb
174 | *.ma
175 | *.3ds
176 | *.c4d
177 | *.stl
178 | *.glb
179 | *.gltf
180 | 
181 | # IDE and Editor Files
182 | .idea/
183 | .vscode/
184 | *.swp
185 | *.swo
186 | *.swn
187 | *.bak
188 | 
189 | # Build and Cache
190 | dist/
191 | build/
192 | out/
193 | workspace-data/
194 | .cache/
195 | .temp/
196 | tmp/
197 | *.min.js
198 | *.min.css
199 | 
200 | # NXT Files
201 | *.nxt
202 | .nxt/
203 | .nxt-cache/
204 | nxt-env.d.ts
205 | nxt.config.*
206 | .nxtrc
207 | .nxt-workspace/
208 | 
209 | # Logs and Debug
210 | *.log
211 | debug.log
212 | npm-debug.log*
213 | yarn-debug.log*
214 | yarn-error.log*
215 | 
216 | # Environment and Secrets
217 | .env
218 | .env.*
219 | .env-*
220 | *.env
221 | env.*
222 | *.pem
223 | *.key
224 | *.cert
225 | *.secret
226 | *.secrets
227 | *secret*
228 | *secrets*
229 | *credential*
230 | *credentials*
231 | *password*
232 | *passwords*
233 | *token*
234 | *tokens*
235 | 
236 | # Documentation
237 | LICENSE*
238 | LICENCE*
239 | README*
240 | CHANGELOG*
241 | CONTRIBUTING*
242 | 
243 | # OS Files
244 | .DS_Store
245 | Thumbs.db
246 | desktop.ini
247 | `.trim();
```

src/files.ts
```
1 | import fs from "node:fs";
2 | import path from "node:path";
3 | import type { default as ignore } from "ignore";
4 | 
5 | export function resolveCodefetchPath(outputFile: string) {
6 |   const codefetchDir = path.join(process.cwd(), "codefetch");
7 | 
8 |   // Create codefetch directory if it doesn't exist
9 |   if (!fs.existsSync(codefetchDir)) {
10 |     fs.mkdirSync(codefetchDir, { recursive: true });
11 | 
12 |     // Create .codefetchignore if it doesn't exist
13 |     const ignorePath = path.join(process.cwd(), ".codefetchignore");
14 |     if (!fs.existsSync(ignorePath)) {
15 |       fs.writeFileSync(ignorePath, "codefetch/\n");
16 |     }
17 |   }
18 | 
19 |   return path.join(codefetchDir, outputFile);
20 | }
21 | 
22 | export async function collectFiles(
23 |   dir: string,
24 |   options: {
25 |     ig: ReturnType<typeof ignore>;
26 |     extensionSet: Set<string> | null;
27 |     excludeFiles: string[] | null;
28 |     includeFiles: string[] | null;
29 |     excludeDirs: string[] | null;
30 |     includeDirs: string[] | null;
31 |   }
32 | ): Promise<string[]> {
33 |   const results: string[] = [];
34 |   const list = await fs.promises.readdir(dir);
35 | 
36 |   // Move regex compilation outside the loop
37 |   const excludePatterns = options.excludeFiles?.map(
38 |     (pattern) => new RegExp(pattern.replace(/\*/g, ".*"))
39 |   );
40 |   const includePatterns = options.includeFiles?.map(
41 |     (pattern) => new RegExp(pattern.replace(/\*/g, ".*"))
42 |   );
43 | 
44 |   for (const filename of list) {
45 |     const filePath = path.join(dir, filename);
46 |     const relPath = path.relative(process.cwd(), filePath);
47 | 
48 |     if (options.ig.ignores(relPath)) {
49 |       continue;
50 |     }
51 | 
52 |     const stat = await fs.promises.stat(filePath);
53 | 
54 |     if (stat.isDirectory()) {
55 |       // Check directory filters
56 |       const dirName = path.basename(filePath);
57 |       if (options.excludeDirs && options.excludeDirs.includes(dirName)) {
58 |         continue;
59 |       }
60 |       if (options.includeDirs && !options.includeDirs.includes(dirName)) {
61 |         continue;
62 |       }
63 | 
64 |       results.push(...(await collectFiles(filePath, options)));
65 |     } else {
66 |       // Check file filters
67 |       if (
68 |         excludePatterns &&
69 |         excludePatterns.some((pattern) => pattern.test(filename))
70 |       ) {
71 |         continue;
72 |       }
73 |       if (
74 |         includePatterns &&
75 |         !includePatterns.some((pattern) => pattern.test(filename))
76 |       ) {
77 |         continue;
78 |       }
79 |       if (options.extensionSet) {
80 |         const ext = path.extname(filename);
81 |         if (!options.extensionSet.has(ext)) {
82 |           continue;
83 |         }
84 |       }
85 | 
86 |       results.push(filePath);
87 |     }
88 |   }
89 |   return results;
90 | }
91 | 
92 | function generateTree(
93 |   dir: string,
94 |   level: number,
95 |   prefix = "",
96 |   isLast = true,
97 |   maxLevel = 2,
98 |   currentLevel = 0
99 | ): string {
100 |   if (currentLevel >= maxLevel) return "";
101 | 
102 |   // Don't add root directory to output
103 |   let tree =
104 |     currentLevel === 0
105 |       ? ""
106 |       : `${prefix}${isLast ? "└── " : "├── "}${path.basename(dir)}\n`;
107 | 
108 |   try {
109 |     const files = fs.readdirSync(dir);
110 |     const filteredFiles = files.filter(
111 |       (file) => !file.startsWith(".") && file !== "node_modules"
112 |     );
113 | 
114 |     for (const [index, file] of filteredFiles.entries()) {
115 |       const filePath = path.join(dir, file);
116 |       const isDirectory = fs.statSync(filePath).isDirectory();
117 |       const newPrefix =
118 |         currentLevel === 0 ? "" : prefix + (isLast ? "    " : "│   ");
119 |       const isLastItem = index === filteredFiles.length - 1;
120 | 
121 |       if (isDirectory) {
122 |         tree += generateTree(
123 |           filePath,
124 |           level + 1,
125 |           newPrefix,
126 |           isLastItem,
127 |           maxLevel,
128 |           currentLevel + 1
129 |         );
130 |       } else if (currentLevel < maxLevel) {
131 |         tree += `${newPrefix}${isLastItem ? "└── " : "├── "}${file}\n`;
132 |       }
133 |     }
134 |   } catch {
135 |     // Handle any file system errors silently
136 |   }
137 | 
138 |   return tree;
139 | }
140 | 
141 | export function generateProjectTree(baseDir: string, maxLevel = 2): string {
142 |   return (
143 |     "Project Structure:\n" + generateTree(baseDir, 1, "", true, maxLevel, 0)
144 |   );
145 | }
```

src/index.ts
```
1 | #!/usr/bin/env node
2 | 
3 | import fs from "node:fs";
4 | import path from "node:path";
5 | import { fileURLToPath } from "node:url";
6 | import ignore from "ignore";
7 | import { DEFAULT_IGNORE_PATTERNS } from "./default-ignore";
8 | import { parseArgs } from "./args";
9 | import {
10 |   collectFiles,
11 |   resolveCodefetchPath,
12 |   generateProjectTree,
13 | } from "./files";
14 | import { generateMarkdown } from "./markdown";
15 | 
16 | // Type exports
17 | export type { ParsedArgs } from "./types";
18 | 
19 | // Function exports
20 | export { parseArgs } from "./args";
21 | export {
22 |   collectFiles,
23 |   resolveCodefetchPath,
24 |   generateProjectTree,
25 | } from "./files";
26 | export { generateMarkdown } from "./markdown";
27 | 
28 | // Main function for CLI
29 | async function main() {
30 |   const {
31 |     output: outputFile,
32 |     maxTokens,
33 |     extensions,
34 |     verbose,
35 |     includeFiles,
36 |     excludeFiles,
37 |     includeDirs,
38 |     excludeDirs,
39 |     treeLevel,
40 |   } = parseArgs(process.argv);
41 | 
42 |   // Initialize ignore instance with default patterns
43 |   const ig = ignore().add(
44 |     DEFAULT_IGNORE_PATTERNS.split("\n").filter(
45 |       (line) => line && !line.startsWith("#")
46 |     )
47 |   );
48 | 
49 |   // Try reading .gitignore if it exists
50 |   try {
51 |     const gitignoreContent = fs.readFileSync(
52 |       path.join(process.cwd(), ".gitignore"),
53 |       "utf8"
54 |     );
55 |     ig.add(gitignoreContent);
56 |   } catch {
57 |     // .gitignore not found or unreadable - that's fine
58 |   }
59 | 
60 |   // Create a Set for O(1) lookup
61 |   const extensionSet = extensions ? new Set(extensions) : null;
62 | 
63 |   // Collect files
64 |   const allFiles = await collectFiles(process.cwd(), {
65 |     ig,
66 |     extensionSet,
67 |     excludeFiles,
68 |     includeFiles,
69 |     excludeDirs,
70 |     includeDirs,
71 |   });
72 | 
73 |   // Generate markdown with project tree
74 |   const totalTokens = await generateMarkdown(allFiles, {
75 |     outputPath: outputFile && resolveCodefetchPath(outputFile),
76 |     maxTokens,
77 |     verbose,
78 |     projectTree:
79 |       treeLevel === null
80 |         ? undefined
81 |         : generateProjectTree(process.cwd(), treeLevel),
82 |   });
83 | 
84 |   if (outputFile) {
85 |     console.log(`\n✓ Output written to: codefetch/${outputFile}`);
86 |     console.log(`✓ Approximate token count: ${totalTokens}`);
87 |   }
88 | }
89 | 
90 | // Use top-level await instead of .catch()
91 | if (process.argv[1] === fileURLToPath(import.meta.url)) {
92 |   main().catch((error) => {
93 |     console.error("Error:", error);
94 |     process.exit(1);
95 |   });
96 | }
```

src/markdown.ts
```
1 | import fs from "node:fs";
2 | import path from "node:path";
3 | import readline from "node:readline";
4 | import { Writable } from "node:stream";
5 | 
6 | function estimateTokens(text: string): number {
7 |   return text.split(/[\s\p{P}]+/u).filter(Boolean).length;
8 | }
9 | 
10 | export async function generateMarkdown(
11 |   files: string[],
12 |   options: {
13 |     outputPath: string | null;
14 |     maxTokens: number | null;
15 |     verbose: boolean;
16 |     projectTree?: string;
17 |   }
18 | ): Promise<number> {
19 |   let totalTokens = 0;
20 | 
21 |   // Create output directory if needed
22 |   if (options.outputPath) {
23 |     const outputDir = path.dirname(options.outputPath);
24 |     if (!fs.existsSync(outputDir)) {
25 |       fs.mkdirSync(outputDir, { recursive: true });
26 |     }
27 |   }
28 | 
29 |   // Type-safe write function
30 |   const writeToOutput = (
31 |     output: Writable | typeof process.stdout,
32 |     text: string
33 |   ) => {
34 |     if (output instanceof Writable) {
35 |       output.write(text);
36 |     } else {
37 |       output.write(text);
38 |     }
39 |   };
40 | 
41 |   const output = options.outputPath
42 |     ? fs.createWriteStream(options.outputPath)
43 |     : process.stdout;
44 | 
45 |   // Write project tree if available
46 |   if (options.projectTree) {
47 |     writeToOutput(output, "```\n");
48 |     writeToOutput(output, options.projectTree);
49 |     writeToOutput(output, "```\n\n");
50 |     totalTokens += estimateTokens(options.projectTree);
51 |   }
52 | 
53 |   // Write files
54 |   for (const file of files) {
55 |     const relativePath = path.relative(process.cwd(), file);
56 | 
57 |     const fileStream = fs.createReadStream(file, { encoding: "utf8" });
58 |     const rl = readline.createInterface({
59 |       input: fileStream,
60 |       crlfDelay: Infinity,
61 |     });
62 | 
63 |     writeToOutput(output, `${relativePath}\n`);
64 |     writeToOutput(output, "```\n");
65 | 
66 |     let lineNumber = 1;
67 |     for await (const line of rl) {
68 |       const lineTokens = estimateTokens(line);
69 |       if (options.maxTokens && totalTokens + lineTokens > options.maxTokens) {
70 |         break;
71 |       }
72 | 
73 |       writeToOutput(output, `${lineNumber} | ${line}\n`);
74 |       totalTokens += lineTokens;
75 |       lineNumber++;
76 |     }
77 | 
78 |     writeToOutput(output, "```\n\n");
79 | 
80 |     if (options.maxTokens && totalTokens >= options.maxTokens) {
81 |       break;
82 |     }
83 |   }
84 | 
85 |   if (options.outputPath && output instanceof fs.WriteStream) {
86 |     await new Promise<void>((resolve) => {
87 |       output.end(resolve);
88 |     });
89 |   }
90 | 
91 |   return totalTokens;
92 | }
```

src/types.ts
```
1 | export interface ParsedArgs {
2 |   output: string | null;
3 |   maxTokens: number | null;
4 |   extensions: string[] | null;
5 |   verbose: boolean;
6 |   includeFiles: string[] | null;
7 |   excludeFiles: string[] | null;
8 |   includeDirs: string[] | null;
9 |   excludeDirs: string[] | null;
10 |   treeLevel: number | null;
11 | }
```

test/_setup.ts
```
1 | import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
2 | import { fileURLToPath } from "node:url";
3 | import path from "node:path";
4 | import fs from "node:fs";
5 | 
6 | export const TEST_DIR = path.join(
7 |   path.dirname(fileURLToPath(import.meta.url)),
8 |   "__test__",
9 | );
10 | 
11 | export function createTestDir() {
12 |   if (!fs.existsSync(TEST_DIR)) {
13 |     fs.mkdirSync(TEST_DIR, { recursive: true });
14 |   }
15 | }
16 | 
17 | export function cleanupTestDir() {
18 |   if (fs.existsSync(TEST_DIR)) {
19 |     fs.rmSync(TEST_DIR, { recursive: true, force: true });
20 |   }
21 | }
22 | 
23 | export function createTestFile(filename: string, content: string = "") {
24 |   const filePath = path.join(TEST_DIR, filename);
25 |   fs.writeFileSync(filePath, content);
26 |   return filePath;
27 | }
28 | 
29 | export { beforeEach, afterEach, describe, it, expect, vi };
```

test/unit/args.test.ts
```
1 | import { describe, it, expect } from "vitest";
2 | import { parseArgs } from "../../src/args";
3 | 
4 | describe("parseArgs", () => {
5 |   it("parses output file", () => {
6 |     const args = ["node", "script.js", "-o", "output.md"];
7 |     const result = parseArgs(args);
8 |     expect(result.output).toBe("output.md");
9 |   });
10 | 
11 |   it("parses max tokens", () => {
12 |     const args = ["node", "script.js", "-tok", "1000"];
13 |     const result = parseArgs(args);
14 |     expect(result.maxTokens).toBe(1000);
15 |   });
16 | 
17 |   it("parses extensions", () => {
18 |     const args = ["node", "script.js", "-e", "ts,js"];
19 |     const result = parseArgs(args);
20 |     expect(result.extensions).toEqual([".ts", ".js"]);
21 |   });
22 | 
23 |   it("parses verbose flag", () => {
24 |     const args = ["node", "script.js", "-v"];
25 |     const result = parseArgs(args);
26 |     expect(result.verbose).toBe(true);
27 |   });
28 | 
29 |   it("parses include files", () => {
30 |     const args = ["node", "script.js", "-if", "file1.ts,file2.ts"];
31 |     const result = parseArgs(args);
32 |     expect(result.includeFiles).toEqual(["file1.ts", "file2.ts"]);
33 |   });
34 | 
35 |   it("parses exclude files", () => {
36 |     const args = ["node", "script.js", "-ef", "test.ts,spec.ts"];
37 |     const result = parseArgs(args);
38 |     expect(result.excludeFiles).toEqual(["test.ts", "spec.ts"]);
39 |   });
40 | 
41 |   it("parses include directories", () => {
42 |     const args = ["node", "script.js", "-id", "src,lib"];
43 |     const result = parseArgs(args);
44 |     expect(result.includeDirs).toEqual(["src", "lib"]);
45 |   });
46 | 
47 |   it("parses exclude directories", () => {
48 |     const args = ["node", "script.js", "-ed", "test,dist"];
49 |     const result = parseArgs(args);
50 |     expect(result.excludeDirs).toEqual(["test", "dist"]);
51 |   });
52 | });
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
16 |     fs.writeFileSync(path.join(TEST_DIR, "test2.js"), "test content");
17 |     fs.writeFileSync(path.join(TEST_DIR, ".gitignore"), "test1.ts");
18 |   });
19 | 
20 |   afterEach(() => {
21 |     // Clean up test files
22 |     if (fs.existsSync(TEST_DIR)) {
23 |       fs.rmSync(TEST_DIR, { recursive: true, force: true });
24 |     }
25 |   });
26 | 
27 |   it("should collect files with extension filter", async () => {
28 |     const files = await collectFiles(TEST_DIR, {
29 |       ig: ignore(),
30 |       extensionSet: new Set([".ts"]),
31 |       excludeFiles: null,
32 |       includeFiles: null,
33 |       excludeDirs: null,
34 |       includeDirs: null,
35 |     });
36 | 
37 |     expect(files).toHaveLength(1);
38 |     expect(files[0]).toContain("test1.ts");
39 |   });
40 | 
41 |   it("should respect include/exclude patterns", async () => {
42 |     const files = await collectFiles(TEST_DIR, {
43 |       ig: ignore(),
44 |       extensionSet: null,
45 |       excludeFiles: ["test2*"],
46 |       includeFiles: ["test*"],
47 |       excludeDirs: null,
48 |       includeDirs: null,
49 |     });
50 | 
51 |     expect(files).toHaveLength(1);
52 |     expect(files[0]).toContain("test1.ts");
53 |   });
54 | 
55 |   it("should respect directory filters", async () => {
56 |     // Create a subdirectory
57 |     const subDir = path.join(TEST_DIR, "subdir");
58 |     fs.mkdirSync(subDir);
59 |     fs.writeFileSync(path.join(subDir, "test3.ts"), "test content");
60 | 
61 |     const files = await collectFiles(TEST_DIR, {
62 |       ig: ignore(),
63 |       extensionSet: null,
64 |       excludeFiles: null,
65 |       includeFiles: null,
66 |       excludeDirs: ["subdir"],
67 |       includeDirs: null,
68 |     });
69 | 
70 |     expect(files).toHaveLength(3); // test1.ts, test2.js, .gitignore
71 |     expect(files.every((f) => !f.includes("subdir"))).toBe(true);
72 |   });
73 | 
74 |   it("should handle ignore patterns", async () => {
75 |     const ig = ignore().add("test1.ts");
76 |     const files = await collectFiles(TEST_DIR, {
77 |       ig,
78 |       extensionSet: null,
79 |       excludeFiles: null,
80 |       includeFiles: null,
81 |       excludeDirs: null,
82 |       includeDirs: null,
83 |     });
84 | 
85 |     expect(files).toHaveLength(2); // test2.js and .gitignore
86 |     expect(files.every((f) => !f.includes("test1.ts"))).toBe(true);
87 |   });
88 | });
```

test/unit/markdown.test.ts
```
1 | import { describe, it, expect, beforeEach, afterEach } from "vitest";
2 | import fs from "node:fs";
3 | import path from "node:path";
4 | import { generateMarkdown } from "../../src/index";
5 | 
6 | const TEST_DIR = path.join(__dirname, "..", "__test__");
7 | 
8 | describe("generateMarkdown", () => {
9 |   beforeEach(async () => {
10 |     // Clean up any existing test files first
11 |     if (fs.existsSync(TEST_DIR)) {
12 |       fs.rmSync(TEST_DIR, { recursive: true, force: true });
13 |     }
14 | 
15 |     // Create test directory and files
16 |     fs.mkdirSync(TEST_DIR, { recursive: true });
17 |     await Promise.all([
18 |       fs.promises.writeFile(path.join(TEST_DIR, "test1.ts"), "test content 1"),
19 |       fs.promises.writeFile(path.join(TEST_DIR, "test2.js"), "test content 2"),
20 |     ]);
21 |   });
22 | 
23 |   afterEach(() => {
24 |     // Clean up test files
25 |     if (fs.existsSync(TEST_DIR)) {
26 |       fs.rmSync(TEST_DIR, { recursive: true, force: true });
27 |     }
28 |   });
29 | 
30 |   it("should generate markdown with file contents", async () => {
31 |     const outputPath = path.join(TEST_DIR, "output.md");
32 |     const files = [
33 |       path.join(TEST_DIR, "test1.ts"),
34 |       path.join(TEST_DIR, "test2.js"),
35 |     ];
36 | 
37 |     // Ensure output directory exists
38 |     fs.mkdirSync(path.dirname(outputPath), { recursive: true });
39 | 
40 |     const tokens = await generateMarkdown(files, {
41 |       outputPath,
42 |       maxTokens: null,
43 |       verbose: false,
44 |     });
45 | 
46 |     // Wait a bit for file system operations to complete
47 |     await new Promise((resolve) => setTimeout(resolve, 100));
48 | 
49 |     expect(tokens).toBeGreaterThan(0);
50 |     expect(fs.existsSync(outputPath)).toBe(true);
51 | 
52 |     const content = fs.readFileSync(outputPath, "utf8");
53 |     expect(content).toContain("test1.ts");
54 |     expect(content).toContain("test2.js");
55 |     expect(content).toContain("test content 1");
56 |     expect(content).toContain("test content 2");
57 |   });
58 | 
59 |   it("should respect maxTokens limit", async () => {
60 |     const outputPath = path.join(TEST_DIR, "output.md");
61 |     const files = [path.join(TEST_DIR, "test1.ts")];
62 | 
63 |     // Ensure output directory exists
64 |     fs.mkdirSync(path.dirname(outputPath), { recursive: true });
65 | 
66 |     const tokens = await generateMarkdown(files, {
67 |       outputPath,
68 |       maxTokens: 2,
69 |       verbose: false,
70 |     });
71 | 
72 |     // Wait a bit for file system operations to complete
73 |     await new Promise((resolve) => setTimeout(resolve, 100));
74 | 
75 |     expect(tokens).toBeLessThanOrEqual(2);
76 |     const content = fs.readFileSync(outputPath, "utf8");
77 |     expect(content.split("\n").length).toBeLessThan(10);
78 |   });
79 | 
80 |   it("should write to stdout when no output path", async () => {
81 |     const files = [path.join(TEST_DIR, "test1.ts")];
82 |     const tokens = await generateMarkdown(files, {
83 |       outputPath: null,
84 |       maxTokens: null,
85 |       verbose: false,
86 |     });
87 | 
88 |     expect(tokens).toBeGreaterThan(0);
89 |   });
90 | });
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
18 |   }
19 | } 
```

vitest.config.ts
```
1 | import { defineConfig } from "vitest/config";
2 | 
3 | export default defineConfig({
4 |   test: {
5 |     coverage: {
6 |       provider: "v8",
7 |       reporter: ["text", "json", "html"],
8 |       exclude: ["node_modules/**", "dist/**", "**/*.test.ts", "**/*.config.ts"],
9 |     },
10 |     environment: "node",
11 |   },
12 | });
```

