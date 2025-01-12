/build.config.ts:
--------------------------------------------------------------------------------
1 | import { defineBuildConfig } from "unbuild";
2 | 
3 | export default defineBuildConfig({
4 |   entries: ["./src/index"],
5 |   declaration: true,
6 |   clean: true,
7 |   rollup: {
8 |     emitCJS: true,
9 |   },
10 | });
11 | 

--------------------------------------------------------------------------------
/src/default-ignore.ts:
--------------------------------------------------------------------------------
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
29 | .prettierrc*
30 | .stylelintrc*
31 | .tsbuildinfo
32 | 
33 | # Binary and Image Files
34 | # Images
35 | *.png
36 | *.jpg
37 | *.jpeg
38 | *.gif
39 | *.ico
40 | *.webp
41 | *.bmp
42 | *.tiff
43 | *.tif
44 | *.raw
45 | *.cr2
46 | *.nef
47 | *.heic
48 | *.heif
49 | *.avif
50 | *.svg
51 | *.eps
52 | *.ai
53 | *.psd
54 | *.xcf
55 | 
56 | # Videos
57 | *.mp4
58 | *.mov
59 | *.avi
60 | *.wmv
61 | *.flv
62 | *.mkv
63 | *.webm
64 | *.m4v
65 | *.mpg
66 | *.mpeg
67 | *.3gp
68 | *.3g2
69 | *.ogv
70 | *.vob
71 | 
72 | # Audio
73 | *.mp3
74 | *.wav
75 | *.ogg
76 | *.m4a
77 | *.flac
78 | *.aac
79 | *.wma
80 | *.aiff
81 | *.mid
82 | *.midi
83 | 
84 | # Documents and PDFs
85 | *.pdf
86 | *.doc
87 | *.docx
88 | *.xls
89 | *.xlsx
90 | *.ppt
91 | *.pptx
92 | *.odt
93 | *.ods
94 | *.odp
95 | *.pages
96 | *.numbers
97 | *.key
98 | 
99 | # Archives and Compressed
100 | *.zip
101 | *.tar
102 | *.gz
103 | *.tgz
104 | *.rar
105 | *.7z
106 | *.bz2
107 | *.xz
108 | *.lz
109 | *.lzma
110 | *.lzo
111 | *.rz
112 | *.lz4
113 | *.zst
114 | *.br
115 | *.cab
116 | *.iso
117 | *.dmg
118 | *.img
119 | 
120 | # Binary and Executable
121 | *.exe
122 | *.dll
123 | *.so
124 | *.dylib
125 | *.bin
126 | *.o
127 | *.obj
128 | *.lib
129 | *.a
130 | *.class
131 | *.pyc
132 | *.pyo
133 | *.pyd
134 | *.deb
135 | *.rpm
136 | *.pkg
137 | *.app
138 | *.sys
139 | *.ko
140 | 
141 | # Database and Data Files
142 | *.dat
143 | *.db
144 | *.sqlite
145 | *.sqlite3
146 | *.mdb
147 | *.accdb
148 | *.dbf
149 | *.mdf
150 | *.ldf
151 | *.frm
152 | *.ibd
153 | *.idx
154 | *.dmp
155 | *.bak
156 | *.bson
157 | 
158 | # Font Files
159 | *.ttf
160 | *.otf
161 | *.woff
162 | *.woff2
163 | *.eot
164 | 
165 | # Model and 3D Files
166 | *.fbx
167 | *.obj
168 | *.max
169 | *.blend
170 | *.dae
171 | *.mb
172 | *.ma
173 | *.3ds
174 | *.c4d
175 | *.stl
176 | *.glb
177 | *.gltf
178 | 
179 | # IDE and Editor Files
180 | .idea/
181 | .vscode/
182 | *.swp
183 | *.swo
184 | *.swn
185 | *.bak
186 | 
187 | # Build and Cache
188 | dist/
189 | build/
190 | out/
191 | workspace-data/
192 | .cache/
193 | .temp/
194 | tmp/
195 | *.min.js
196 | *.min.css
197 | 
198 | # NXT Files
199 | *.nxt
200 | .nxt/
201 | .nxt-cache/
202 | nxt-env.d.ts
203 | nxt.config.*
204 | .nxtrc
205 | .nxt-workspace/
206 | 
207 | # Logs and Debug
208 | *.log
209 | debug.log
210 | npm-debug.log*
211 | yarn-debug.log*
212 | yarn-error.log*
213 | 
214 | # Environment and Secrets
215 | .env
216 | .env.*
217 | .env-*
218 | *.env
219 | env.*
220 | *.pem
221 | *.key
222 | *.cert
223 | *.secret
224 | *.secrets
225 | *secret*
226 | *secrets*
227 | *credential*
228 | *credentials*
229 | *password*
230 | *passwords*
231 | *token*
232 | *tokens*
233 | 
234 | # Documentation
235 | LICENSE*
236 | LICENCE*
237 | README*
238 | CHANGELOG*
239 | CONTRIBUTING*
240 | 
241 | # OS Files
242 | .DS_Store
243 | Thumbs.db
244 | desktop.ini
245 | `.trim();
246 | 

--------------------------------------------------------------------------------
/src/index.ts:
--------------------------------------------------------------------------------
1 | #!/usr/bin/env node
2 | 
3 | import fs from "node:fs";
4 | import path from "node:path";
5 | import process from "node:process";
6 | import { fileURLToPath } from "node:url";
7 | 
8 | // We'll use `ignore` to handle ignoring files
9 | import ignore from "ignore";
10 | import { DEFAULT_IGNORE_PATTERNS } from "./default-ignore";
11 | 
12 | // Add this right after the imports
13 | if (!DEFAULT_IGNORE_PATTERNS || typeof DEFAULT_IGNORE_PATTERNS !== "string") {
14 |   console.error("Warning: Default ignore patterns could not be loaded");
15 |   process.exit(1);
16 | }
17 | 
18 | // Resolve current directory in ESM context
19 | const __filename = fileURLToPath(import.meta.url);
20 | const __dirname = path.dirname(__filename);
21 | 
22 | interface ParsedArgs {
23 |   output: string | null;
24 |   maxTokens: number | null;
25 |   extensions: string[] | null;
26 |   verbose: boolean;
27 | }
28 | 
29 | /**
30 |  * Simple function to parse CLI args:
31 |  *
32 |  * -o, --output <file> : specify output filename
33 |  * --max-tokens, -tok <number> : limit output tokens
34 |  * -e, --extension <ext,...> : filter by file extensions (.ts,.js etc)
35 |  */
36 | function parseArgs(argv: string[]): ParsedArgs {
37 |   const result: ParsedArgs = {
38 |     output: null,
39 |     maxTokens: null,
40 |     extensions: null,
41 |     verbose: false,
42 |   };
43 |   for (let i = 2; i < argv.length; i++) {
44 |     const arg = argv[i];
45 |     if (arg === "-h" || arg === "--help") {
46 |       printHelp();
47 |       process.exit(0);
48 |     } else if (arg === "-v" || arg === "--verbose") {
49 |       result.verbose = true;
50 |     } else if ((arg === "-o" || arg === "--output") && argv[i + 1]) {
51 |       result.output = argv[i + 1];
52 |       i++;
53 |     } else if ((arg === "--max-tokens" || arg === "-tok") && argv[i + 1]) {
54 |       const tokens = parseInt(argv[i + 1]);
55 |       if (!isNaN(tokens)) {
56 |         result.maxTokens = tokens;
57 |       }
58 |       i++;
59 |     } else if ((arg === "-e" || arg === "--extension") && argv[i + 1]) {
60 |       result.extensions = argv[i + 1]
61 |         .split(",")
62 |         .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));
63 |       i++;
64 |     }
65 |   }
66 |   return result;
67 | }
68 | 
69 | const { output, maxTokens, extensions, verbose } = parseArgs(process.argv);
70 | 
71 | // Initialize ignore instance with default patterns
72 | const ig = ignore().add(
73 |   DEFAULT_IGNORE_PATTERNS.split("\n").filter(
74 |     (line) => line && !line.startsWith("#")
75 |   )
76 | );
77 | 
78 | // Try reading .gitignore if it exists
79 | try {
80 |   const gitignoreContent = fs.readFileSync(
81 |     path.join(process.cwd(), ".gitignore"),
82 |     "utf8"
83 |   );
84 |   ig.add(gitignoreContent);
85 | } catch {
86 |   // .gitignore not found or unreadable - that's fine
87 | }
88 | 
89 | // Try reading .codefetchignore if it exists
90 | try {
91 |   const codefetchignoreContent = fs.readFileSync(
92 |     path.join(process.cwd(), ".codefetchignore"),
93 |     "utf8"
94 |   );
95 |   ig.add(codefetchignoreContent);
96 | } catch {
97 |   // .codefetchignore not found or unreadable - that's fine
98 | }
99 | 
100 | /**
101 |  * Recursively collect all files in the current working directory,
102 |  * ignoring anything matched by .gitignore or .codefetchignore (if present).
103 |  */
104 | function collectFiles(dir: string): string[] {
105 |   const results: string[] = [];
106 |   const list = fs.readdirSync(dir);
107 | 
108 |   for (const filename of list) {
109 |     const filePath = path.join(dir, filename);
110 |     const relPath = path.relative(process.cwd(), filePath);
111 | 
112 |     if (ig.ignores(relPath)) {
113 |       verbose && console.log(`Ignoring: ${relPath}`);
114 |       continue;
115 |     }
116 | 
117 |     const stat = fs.statSync(filePath);
118 | 
119 |     if (stat.isDirectory()) {
120 |       verbose && console.log(`Processing directory: ${relPath}`);
121 |       results.push(...collectFiles(filePath));
122 |     } else {
123 |       if (extensions) {
124 |         const ext = path.extname(filename);
125 |         if (!extensions.includes(ext)) {
126 |           verbose && console.log(`Skipping non-matching extension: ${relPath}`);
127 |           continue;
128 |         }
129 |       }
130 |       verbose && console.log(`Processing file: ${relPath}`);
131 |       results.push(filePath);
132 |     }
133 |   }
134 |   return results;
135 | }
136 | 
137 | // Actually gather up the file list
138 | const allFiles = collectFiles(process.cwd());
139 | 
140 | /**
141 |  * Very rough token count estimation.
142 |  * This is a simple approximation - actual tokens may vary by tokenizer.
143 |  */
144 | function estimateTokens(text: string): number {
145 |   // Rough estimate: Split on whitespace and punctuation
146 |   return text.split(/[\s\p{P}]+/u).length;
147 | }
148 | 
149 | /**
150 |  * Generate the final markdown content.
151 |  * We replicate the style:
152 |  *
153 |  * /path/to/file:
154 |  * --------------------------------------------------------------------------------
155 |  * 1 | ...
156 |  * 2 | ...
157 |  * --------------------------------------------------------------------------------
158 |  */
159 | function generateMarkdown(files: string[]): string {
160 |   const lines: string[] = [];
161 |   let totalTokens = 0;
162 | 
163 |   verbose && console.log("\nGenerating markdown output...");
164 | 
165 |   for (const file of files) {
166 |     const relativePath = path.relative(process.cwd(), file);
167 |     const content = fs.readFileSync(file, "utf8");
168 |     const fileTokens = estimateTokens(content);
169 | 
170 |     if (maxTokens && totalTokens + fileTokens > maxTokens) {
171 |       verbose &&
172 |         console.log(`Skipping ${relativePath} (would exceed token limit)`);
173 |       continue;
174 |     }
175 | 
176 |     verbose &&
177 |       console.log(`Adding to output: ${relativePath} (${fileTokens} tokens)`);
178 |     totalTokens += fileTokens;
179 | 
180 |     // Rest of the existing markdown generation code...
181 |     lines.push(`/${relativePath}:`);
182 |     lines.push(
183 |       "--------------------------------------------------------------------------------"
184 |     );
185 | 
186 |     const fileLines = content.split("\n");
187 |     fileLines.forEach((line, i) => {
188 |       lines.push(`${i + 1} | ${line}`);
189 |     });
190 | 
191 |     lines.push("");
192 |     lines.push(
193 |       "--------------------------------------------------------------------------------"
194 |     );
195 |   }
196 | 
197 |   // if (maxTokens) {
198 |   //   lines.unshift(`// Approximate token count: ${totalTokens}\n`);
199 |   // }
200 | 
201 |   return lines.join("\n");
202 | }
203 | 
204 | // Build the final output
205 | const final = generateMarkdown(allFiles);
206 | 
207 | // Write to file if `-o/--output` was given, else print to stdout
208 | if (output) {
209 |   // Create codefetch directory if it doesn't exist
210 |   const codefetchDir = path.join(process.cwd(), "codefetch");
211 |   if (!fs.existsSync(codefetchDir)) {
212 |     fs.mkdirSync(codefetchDir, { recursive: true });
213 |     console.log("Created codefetch directory.");
214 |   }
215 | 
216 |   // Create .codefetchignore if it doesn't exist
217 |   const codefetchignorePath = path.join(process.cwd(), ".codefetchignore");
218 |   if (!fs.existsSync(codefetchignorePath)) {
219 |     const ignoreContent = "# Codefetch specific ignores\ncodefetch/\n";
220 |     fs.writeFileSync(codefetchignorePath, ignoreContent, "utf8");
221 |     console.log(
222 |       "Created .codefetchignore file. Add 'codefetch/' to your .gitignore to avoid committing fetched code."
223 |     );
224 |   }
225 | 
226 |   // Write the output file to the codefetch directory
227 |   const outputPath = path.join(codefetchDir, output);
228 |   fs.writeFileSync(outputPath, final, "utf8");
229 | 
230 |   // Calculate and display token count
231 |   const totalTokens = estimateTokens(final);
232 | 
233 |   console.log("\nSummary:");
234 |   console.log("✓ Code was successfully fetched");
235 |   console.log(`✓ Output written to: ${outputPath}`);
236 |   console.log(`✓ Approximate token count: ${totalTokens}`);
237 | } else {
238 |   console.log(final);
239 | }
240 | 
241 | function printHelp() {
242 |   console.log(`
243 | Usage: codefetch [options]
244 | 
245 | Options:
246 |   -o, --output <file>       Specify output filename
247 |   -tok, --max-tokens <n>    Limit output tokens (useful for AI models)
248 |   -e, --extension <ext,...> Filter by file extensions (e.g., .ts,.js)
249 |   -v, --verbose            Show detailed processing information
250 |   -h, --help               Display this help message
251 | `);
252 | }
253 | 

--------------------------------------------------------------------------------
/tsup.config.ts:
--------------------------------------------------------------------------------
1 |  

--------------------------------------------------------------------------------