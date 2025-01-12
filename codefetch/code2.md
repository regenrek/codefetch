```
Project Structure:
├── LICENSE
├── README.md
├── build.config.ts
├── codefetch
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
10 |   -tok, --max-tokens <n>      Limit output tokens (useful for AI models)
11 |   -e, --extension <ext,...>   Filter by file extensions (e.g., .ts,.js)
12 |   -if, --include-files <p,..> Include specific files (supports patterns)
13 |   -ef, --exclude-files <p,..> Exclude specific files (supports patterns)
14 |   -id, --include-dir <d,...>  Include specific directories
15 |   -ed, --exclude-dir <d,...>  Exclude specific directories
16 |   -t, --project-tree <level>  Generate project tree with specified depth (default: 2)
17 |   -v, --verbose [level]       Show processing information (0=none, 1=basic, 2=debug)
18 |   -h, --help                 Display this help message
19 | `);
20 | }
21 | 
22 | export function parseArgs(args: string[]) {
23 |   const argv = minimist(args, {
24 |     string: [
25 |       "output",
26 |       "extension",
27 |       "include-files",
28 |       "exclude-files",
29 |       "include-dir",
30 |       "exclude-dir",
31 |     ],
32 |     boolean: ["help", "project-tree"],
33 |     alias: {
34 |       o: "output",
35 |       e: "extension",
36 |       if: "include-files",
37 |       ef: "exclude-files",
38 |       id: "include-dir",
39 |       ed: "exclude-dir",
40 |       v: "verbose",
41 |       t: "project-tree",
42 |       tok: "max-tokens",
43 |       h: "help",
44 |     },
45 |   });
46 | 
47 |   // Handle project-tree flag with default value
48 |   let treeDepth: number | undefined;
49 |   if (argv["project-tree"]) {
50 |     // If -t or --project-tree is used without a value, use default of 2
51 |     treeDepth =
52 |       typeof argv["project-tree"] === "number" ? argv["project-tree"] : 2;
53 |   }
54 | 
55 |   return {
56 |     output: argv.output,
57 |     extensions: argv.extension?.split(","),
58 |     includeFiles: argv["include-files"]?.split(","),
59 |     excludeFiles: argv["exclude-files"]?.split(","),
60 |     includeDirs: argv["include-dir"]?.split(","),
61 |     excludeDirs: argv["exclude-dir"]?.split(","),
62 |     verbose: argv.verbose === undefined ? 1 : Number(argv.verbose),
63 |     projectTree: treeDepth,
64 |     maxTokens: argv["max-tokens"] ? Number(argv["max-tokens"]) : undefined,
65 |     help: argv.help,
66 |   };
67 | }
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
36 | .prettierignore
37 | 
38 | # Binary and Image Files
39 | # Images
40 | *.png
41 | *.jpg
42 | *.jpeg
43 | *.gif
44 | *.ico
45 | *.webp
46 | *.bmp
47 | *.tiff
48 | *.tif
49 | *.raw
50 | *.cr2
51 | *.nef
52 | *.heic
53 | *.heif
54 | *.avif
55 | *.svg
56 | *.eps
57 | *.ai
58 | *.psd
59 | *.xcf
60 | 
61 | # Videos
62 | *.mp4
63 | *.mov
64 | *.avi
65 | *.wmv
66 | *.flv
67 | *.mkv
68 | *.webm
69 | *.m4v
70 | *.mpg
71 | *.mpeg
72 | *.3gp
73 | *.3g2
74 | *.ogv
75 | *.vob
76 | 
77 | # Audio
78 | *.mp3
79 | *.wav
80 | *.ogg
81 | *.m4a
82 | *.flac
83 | *.aac
84 | *.wma
85 | *.aiff
86 | *.mid
87 | *.midi
88 | 
89 | # Documents and PDFs
90 | *.pdf
91 | *.doc
92 | *.docx
93 | *.xls
94 | *.xlsx
95 | *.ppt
96 | *.pptx
97 | *.odt
98 | *.ods
99 | *.odp
100 | *.pages
101 | *.numbers
102 | *.key
103 | 
104 | # Archives and Compressed
105 | *.zip
106 | *.tar
107 | *.gz
108 | *.tgz
109 | *.rar
110 | *.7z
111 | *.bz2
112 | *.xz
113 | *.lz
114 | *.lzma
115 | *.lzo
116 | *.rz
117 | *.lz4
118 | *.zst
119 | *.br
120 | *.cab
121 | *.iso
122 | *.dmg
123 | *.img
124 | 
125 | # Binary and Executable
126 | *.exe
127 | *.dll
128 | *.so
129 | *.dylib
130 | *.bin
131 | *.o
132 | *.obj
133 | *.lib
134 | *.a
135 | *.class
136 | *.pyc
137 | *.pyo
138 | *.pyd
139 | *.deb
140 | *.rpm
141 | *.pkg
142 | *.app
143 | *.sys
144 | *.ko
145 | 
146 | # Database and Data Files
147 | *.dat
148 | *.db
149 | *.sqlite
150 | *.sqlite3
151 | *.mdb
152 | *.accdb
153 | *.dbf
154 | *.mdf
155 | *.ldf
156 | *.frm
157 | *.ibd
158 | *.idx
159 | *.dmp
160 | *.bak
161 | *.bson
162 | 
163 | # Font Files
164 | *.ttf
165 | *.otf
166 | *.woff
167 | *.woff2
168 | *.eot
169 | 
170 | # Model and 3D Files
171 | *.fbx
172 | *.obj
173 | *.max
174 | *.blend
175 | *.dae
176 | *.mb
177 | *.ma
178 | *.3ds
179 | *.c4d
180 | *.stl
181 | *.glb
182 | *.gltf
183 | 
184 | # IDE and Editor Files
185 | .idea/
186 | .vscode/
187 | *.swp
188 | *.swo
189 | *.swn
190 | *.bak
191 | 
192 | # Build and Cache
193 | dist/
194 | build/
195 | out/
196 | workspace-data/
197 | .cache/
198 | .temp/
199 | tmp/
200 | *.min.js
201 | *.min.css
202 | 
203 | # NXT Files
204 | *.nxt
205 | .nxt/
206 | .nxt-cache/
207 | nxt-env.d.ts
208 | nxt.config.*
209 | .nxtrc
210 | .nxt-workspace/
211 | 
212 | # Logs and Debug
213 | *.log
214 | debug.log
215 | npm-debug.log*
216 | yarn-debug.log*
217 | yarn-error.log*
218 | 
219 | # Environment and Secrets
220 | .env
221 | .env.*
222 | .env-*
223 | *.env
224 | env.*
225 | *.pem
226 | *.key
227 | *.cert
228 | *.secret
229 | *.secrets
230 | *secret*
231 | *secrets*
232 | *credential*
233 | *credentials*
234 | *password*
235 | *passwords*
236 | *token*
237 | *tokens*
238 | 
239 | # Documentation
240 | LICENSE*
241 | LICENCE*
242 | README*
243 | CHANGELOG*
244 | CONTRIBUTING*
245 | 
246 | # OS Files
247 | .DS_Store
248 | Thumbs.db
249 | desktop.ini
250 | `.trim();
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
11 |   }
12 | 
13 |   return path.join(codefetchDir, outputFile);
14 | }
15 | 
16 | export async function collectFiles(
17 |   baseDir: string,
18 |   options: {
19 |     ig: ReturnType<typeof ignore>;
20 |     extensionSet: Set<string> | null;
21 |     excludeFiles: string[] | null;
22 |     includeFiles: string[] | null;
23 |     excludeDirs: string[] | null;
24 |     includeDirs: string[] | null;
25 |     verbose: number;
26 |   }
27 | ): Promise<string[]> {
28 |   const {
29 |     ig,
30 |     extensionSet,
31 |     excludeFiles,
32 |     includeFiles,
33 |     excludeDirs,
34 |     includeDirs,
35 |     verbose,
36 |   } = options;
37 | 
38 |   function logVerbose(message: string, level: number) {
39 |     if (verbose >= level) {
40 |       console.log(message);
41 |     }
42 |   }
43 | 
44 |   logVerbose(`Scanning directory: ${baseDir}`, 2);
45 | 
46 |   const results: string[] = [];
47 |   const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
48 | 
49 |   // Check if current directory should be included when includeDirs is specified
50 |   const relativeBaseDir = path.relative(process.cwd(), baseDir);
51 |   if (includeDirs && relativeBaseDir) {
52 |     const shouldInclude = includeDirs.some(
53 |       (dir) =>
54 |         relativeBaseDir === dir || relativeBaseDir.startsWith(dir + path.sep)
55 |     );
56 |     if (!shouldInclude) {
57 |       logVerbose(
58 |         `Skipping directory not in include list: ${relativeBaseDir}`,
59 |         2
60 |       );
61 |       return results;
62 |     }
63 |   }
64 | 
65 |   for (const entry of entries) {
66 |     const fullPath = path.join(baseDir, entry.name);
67 |     const relativePath = path.relative(process.cwd(), fullPath);
68 |     const ignoreCheckPath = entry.isDirectory()
69 |       ? `${relativePath}/`
70 |       : relativePath;
71 | 
72 |     if (entry.isDirectory()) {
73 |       // Directory handling
74 |       if (
75 |         excludeDirs?.some(
76 |           (dir) =>
77 |             relativePath === dir || relativePath.startsWith(dir + path.sep)
78 |         )
79 |       ) {
80 |         logVerbose(`Skipping excluded directory: ${relativePath}`, 2);
81 |         continue;
82 |       }
83 | 
84 |       if (ig.ignores(ignoreCheckPath)) {
85 |         logVerbose(`Skipping ignored directory: ${relativePath}`, 2);
86 |         continue;
87 |       }
88 | 
89 |       results.push(...(await collectFiles(fullPath, options)));
90 |     } else if (entry.isFile()) {
91 |       // File handling
92 |       if (ig.ignores(ignoreCheckPath)) {
93 |         logVerbose(`Skipping ignored file: ${relativePath}`, 2);
94 |         continue;
95 |       }
96 |       if (excludeFiles?.some((pattern) => matchPattern(entry.name, pattern))) {
97 |         logVerbose(`Skipping excluded file: ${relativePath}`, 2);
98 |         continue;
99 |       }
100 |       if (
101 |         includeFiles &&
102 |         !includeFiles.some((pattern) => matchPattern(entry.name, pattern))
103 |       ) {
104 |         logVerbose(`Skipping non-included file: ${relativePath}`, 2);
105 |         continue;
106 |       }
107 |       if (extensionSet && !extensionSet.has(path.extname(entry.name))) {
108 |         logVerbose(
109 |           `Skipping file with non-matching extension: ${relativePath}`,
110 |           2
111 |         );
112 |         continue;
113 |       }
114 | 
115 |       logVerbose(`Adding file: ${relativePath}`, 2);
116 |       results.push(fullPath);
117 |     }
118 |   }
119 | 
120 |   return results;
121 | }
122 | 
123 | function matchPattern(filename: string, pattern: string): boolean {
124 |   // Convert glob pattern to regex pattern
125 |   const regexPattern = pattern
126 |     .replace(/\./g, "\\.")
127 |     .replace(/\*/g, ".*")
128 |     .replace(/\?/g, ".");
129 |   return new RegExp(`^${regexPattern}$`).test(filename);
130 | }
131 | 
132 | function generateTree(
133 |   dir: string,
134 |   level: number,
135 |   prefix = "",
136 |   isLast = true,
137 |   maxLevel = 2,
138 |   currentLevel = 0
139 | ): string {
140 |   if (currentLevel >= maxLevel) return "";
141 | 
142 |   // Don't add root directory to output
143 |   let tree =
144 |     currentLevel === 0
145 |       ? ""
146 |       : `${prefix}${isLast ? "└── " : "├── "}${path.basename(dir)}\n`;
147 | 
148 |   try {
149 |     const files = fs.readdirSync(dir);
150 |     const filteredFiles = files.filter(
151 |       (file) => !file.startsWith(".") && file !== "node_modules"
152 |     );
153 | 
154 |     for (const [index, file] of filteredFiles.entries()) {
155 |       const filePath = path.join(dir, file);
156 |       const isDirectory = fs.statSync(filePath).isDirectory();
157 |       const newPrefix =
158 |         currentLevel === 0 ? "" : prefix + (isLast ? "    " : "│   ");
159 |       const isLastItem = index === filteredFiles.length - 1;
160 | 
161 |       if (isDirectory) {
162 |         tree += generateTree(
163 |           filePath,
164 |           level + 1,
165 |           newPrefix,
166 |           isLastItem,
167 |           maxLevel,
168 |           currentLevel + 1
169 |         );
170 |       } else if (currentLevel < maxLevel) {
171 |         tree += `${newPrefix}${isLastItem ? "└── " : "├── "}${file}\n`;
172 |       }
173 |     }
174 |   } catch {
175 |     // Handle any file system errors silently
176 |   }
177 | 
178 |   return tree;
179 | }
180 | 
181 | export function generateProjectTree(baseDir: string, maxLevel = 2): string {
182 |   return (
183 |     "Project Structure:\n" + generateTree(baseDir, 1, "", true, maxLevel, 0)
184 |   );
185 | }
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
8 | import { parseArgs, printHelp } from "./args";
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
28 | // Add this helper function at the top level
29 | function ensureCodefetchIgnore() {
30 |   const ignorePath = path.join(process.cwd(), ".codefetchignore");
31 |   if (!fs.existsSync(ignorePath)) {
32 |     fs.writeFileSync(ignorePath, "test/\nvitest.config.ts\n");
33 |   }
34 | }
35 | 
36 | // Main function for CLI
37 | export async function main(args: string[] = process.argv) {
38 |   try {
39 |     const parsedArgs = parseArgs(args);
40 | 
41 |     if (parsedArgs.help) {
42 |       printHelp();
43 |       return;
44 |     }
45 | 
46 |     // Ensure .codefetchignore exists
47 |     ensureCodefetchIgnore();
48 | 
49 |     // Create ignore instance with default patterns
50 |     const ig = ignore().add(
51 |       DEFAULT_IGNORE_PATTERNS.split("\n").filter(
52 |         (line) => line && !line.startsWith("#")
53 |       )
54 |     );
55 | 
56 |     // Add .gitignore patterns if exists
57 |     const defaultIgnorePath = path.join(process.cwd(), ".gitignore");
58 |     if (fs.existsSync(defaultIgnorePath)) {
59 |       ig.add(fs.readFileSync(defaultIgnorePath, "utf8"));
60 |     }
61 | 
62 |     // Add .codefetchignore patterns if exists
63 |     const codefetchIgnorePath = path.join(process.cwd(), ".codefetchignore");
64 |     if (fs.existsSync(codefetchIgnorePath)) {
65 |       ig.add(fs.readFileSync(codefetchIgnorePath, "utf8"));
66 |     }
67 | 
68 |     // Collect files
69 |     const files = await collectFiles(process.cwd(), {
70 |       ig,
71 |       extensionSet: parsedArgs.extensions
72 |         ? new Set(parsedArgs.extensions)
73 |         : null,
74 |       excludeFiles: parsedArgs.excludeFiles || null,
75 |       includeFiles: parsedArgs.includeFiles || null,
76 |       excludeDirs: parsedArgs.excludeDirs || null,
77 |       includeDirs: parsedArgs.includeDirs || null,
78 |       verbose: parsedArgs.verbose,
79 |     });
80 | 
81 |     // Generate markdown
82 |     const markdown = await generateMarkdown(files, {
83 |       outputPath: parsedArgs.output
84 |         ? resolveCodefetchPath(parsedArgs.output)
85 |         : null,
86 |       maxTokens: parsedArgs.maxTokens || null,
87 |       verbose: parsedArgs.verbose,
88 |       projectTree:
89 |         parsedArgs.projectTree === undefined
90 |           ? undefined
91 |           : generateProjectTree(process.cwd(), parsedArgs.projectTree),
92 |     });
93 | 
94 |     // Output
95 |     if (parsedArgs.output) {
96 |       if (parsedArgs.verbose > 0) {
97 |         console.log(
98 |           `Output written to ${resolveCodefetchPath(parsedArgs.output)}`
99 |         );
100 |       }
101 |     } else {
102 |       console.log(markdown);
103 |     }
104 |   } catch (error) {
105 |     if (error instanceof Error && error.message === "Help message displayed") {
106 |       return;
107 |     }
108 |     throw error;
109 |   }
110 | }
111 | 
112 | main();
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
10 | function logVerbose(message: string, level: number, currentVerbosity: number) {
11 |   if (currentVerbosity >= level) {
12 |     console.log(message);
13 |   }
14 | }
15 | 
16 | export async function generateMarkdown(
17 |   files: string[],
18 |   options: {
19 |     outputPath: string | null;
20 |     maxTokens: number | null;
21 |     verbose: number;
22 |     projectTree?: string;
23 |   }
24 | ): Promise<number> {
25 |   let totalTokens = 0;
26 | 
27 |   // Create output directory if needed
28 |   if (options.outputPath) {
29 |     const outputDir = path.dirname(options.outputPath);
30 |     if (!fs.existsSync(outputDir)) {
31 |       fs.mkdirSync(outputDir, { recursive: true });
32 |       logVerbose(`Created output directory: ${outputDir}`, 2, options.verbose);
33 |     }
34 |   }
35 | 
36 |   // Type-safe write function
37 |   const writeToOutput = (
38 |     output: Writable | typeof process.stdout,
39 |     text: string
40 |   ) => {
41 |     if (output instanceof Writable) {
42 |       output.write(text);
43 |     } else {
44 |       output.write(text);
45 |     }
46 |   };
47 | 
48 |   const output = options.outputPath
49 |     ? fs.createWriteStream(options.outputPath)
50 |     : process.stdout;
51 | 
52 |   // Write project tree if available
53 |   if (options.projectTree) {
54 |     logVerbose("Writing project tree...", 2, options.verbose);
55 |     writeToOutput(output, "```\n");
56 |     writeToOutput(output, options.projectTree);
57 |     writeToOutput(output, "```\n\n");
58 |     totalTokens += estimateTokens(options.projectTree);
59 |     logVerbose(
60 |       `Project tree tokens: ${estimateTokens(options.projectTree)}`,
61 |       2,
62 |       options.verbose
63 |     );
64 |   }
65 | 
66 |   // Write files
67 |   for (const file of files) {
68 |     const relativePath = path.relative(process.cwd(), file);
69 |     logVerbose(`Processing file: ${relativePath}`, 1, options.verbose);
70 | 
71 |     const fileStream = fs.createReadStream(file, { encoding: "utf8" });
72 |     const rl = readline.createInterface({
73 |       input: fileStream,
74 |       crlfDelay: Infinity,
75 |     });
76 | 
77 |     writeToOutput(output, `${relativePath}\n`);
78 |     writeToOutput(output, "```\n");
79 | 
80 |     let lineNumber = 1;
81 |     let fileTokens = 0;
82 | 
83 |     for await (const line of rl) {
84 |       const lineTokens = estimateTokens(line);
85 |       if (options.maxTokens && totalTokens + lineTokens > options.maxTokens) {
86 |         logVerbose(
87 |           `Max tokens reached (${totalTokens}/${options.maxTokens})`,
88 |           1,
89 |           options.verbose
90 |         );
91 |         break;
92 |       }
93 | 
94 |       writeToOutput(output, `${lineNumber} | ${line}\n`);
95 |       totalTokens += lineTokens;
96 |       fileTokens += lineTokens;
97 |       lineNumber++;
98 |     }
99 | 
100 |     writeToOutput(output, "```\n\n");
101 |     logVerbose(`File tokens: ${fileTokens}`, 2, options.verbose);
102 | 
103 |     if (options.maxTokens && totalTokens >= options.maxTokens) {
104 |       logVerbose(
105 |         "Max tokens limit reached, stopping processing",
106 |         1,
107 |         options.verbose
108 |       );
109 |       break;
110 |     }
111 |   }
112 | 
113 |   if (options.outputPath && output instanceof fs.WriteStream) {
114 |     await new Promise<void>((resolve) => {
115 |       output.end(resolve);
116 |     });
117 |     logVerbose(`Total tokens processed: ${totalTokens}`, 1, options.verbose);
118 |   }
119 | 
120 |   return totalTokens;
121 | }
```

src/types.ts
```
1 | export interface ParsedArgs {
2 |   output: string | undefined;
3 |   maxTokens: number | undefined;
4 |   extensions: string[] | undefined;
5 |   verbose: number;
6 |   includeFiles: string[] | undefined;
7 |   excludeFiles: string[] | undefined;
8 |   includeDirs: string[] | undefined;
9 |   excludeDirs: string[] | undefined;
10 |   projectTree: number | undefined;
11 |   help: boolean;
12 | }
```

