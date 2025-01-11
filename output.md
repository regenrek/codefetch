/.gitignore:
--------------------------------------------------------------------------------
1 | node_modules/
2 | dist/
3 | *.log
4 | .DS_Store
5 | coverage/
6 | .env 

--------------------------------------------------------------------------------
/LICENSE:
--------------------------------------------------------------------------------
1 | MIT License
2 | 
3 | Copyright (c) 2024 boltfetch
4 | 
5 | Permission is hereby granted, free of charge, to any person obtaining a copy
6 | of this software and associated documentation files (the "Software"), to deal
7 | in the Software without restriction, including without limitation the rights
8 | to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
9 | copies of the Software, and to permit persons to whom the Software is
10 | furnished to do so, subject to the following conditions:
11 | 
12 | The above copyright notice and this permission notice shall be included in all
13 | copies or substantial portions of the Software.
14 | 
15 | THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
16 | IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
17 | FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
18 | AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
19 | LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
20 | OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
21 | SOFTWARE. 

--------------------------------------------------------------------------------
/README.md:
--------------------------------------------------------------------------------
1 | # boltfetch
2 | 
3 | Recursively fetches all code files in the current directory, ignoring what's in `.gitignore`,  
4 | then outputs them into a single Markdown file with line numbers.
5 | 
6 | ## Usage
7 | 
8 | ```bash
9 | npx boltfetch -o my-complete-source.md
10 | ```
11 | 
12 | If -o (or --output) is not provided, it will print to stdout.
13 | 
14 | ## Installation
15 | 
16 | You can run directly with npx:
17 | 
18 | ```bash
19 | npx boltfetch
20 | ```
21 | 
22 | Or install globally:
23 | 
24 | ```bash
25 | npm install -g boltfetch
26 | boltfetch -o output.md
27 | ```
28 | 
29 | ## License
30 | 
31 | MIT 

--------------------------------------------------------------------------------
/asdf.md:
--------------------------------------------------------------------------------
1 | LOLALDA

--------------------------------------------------------------------------------
/index.js:
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
10 | 
11 | // Resolve current directory in ESM context
12 | const __filename = fileURLToPath(import.meta.url);
13 | const __dirname = path.dirname(__filename);
14 | 
15 | /**
16 |  * Simple function to parse CLI args:
17 |  *
18 |  * -o, --output <file> : specify output filename
19 |  */
20 | function parseArgs(argv) {
21 |   const result = {
22 |     output: null,
23 |   };
24 |   for (let i = 2; i < argv.length; i++) {
25 |     const arg = argv[i];
26 |     if ((arg === "-o" || arg === "--output") && argv[i + 1]) {
27 |       result.output = argv[i + 1];
28 |       i++;
29 |     }
30 |   }
31 |   return result;
32 | }
33 | 
34 | const { output } = parseArgs(process.argv);
35 | 
36 | // Try reading .gitignore if it exists
37 | const ig = ignore();
38 | try {
39 |   const gitignoreContent = fs.readFileSync(
40 |     path.join(process.cwd(), ".gitignore"),
41 |     "utf8"
42 |   );
43 |   ig.add(gitignoreContent);
44 | } catch {
45 |   // .gitignore not found or unreadable - that's fine
46 | }
47 | 
48 | /**
49 |  * Recursively collect all files in the current working directory,
50 |  * ignoring anything matched by .gitignore (if present).
51 |  */
52 | function collectFiles(dir) {
53 |   let results = [];
54 |   const list = fs.readdirSync(dir);
55 | 
56 |   for (const filename of list) {
57 |     // Full path
58 |     const filePath = path.join(dir, filename);
59 |     // Relative path from CWD (for ignoring logic)
60 |     const relPath = path.relative(process.cwd(), filePath);
61 | 
62 |     // If ignored by .gitignore, skip
63 |     if (ig.ignores(relPath)) {
64 |       continue;
65 |     }
66 | 
67 |     const stat = fs.statSync(filePath);
68 | 
69 |     if (stat.isDirectory()) {
70 |       // Recurse into subdirectory
71 |       results = results.concat(collectFiles(filePath));
72 |     } else {
73 |       // It's a file
74 |       results.push(filePath);
75 |     }
76 |   }
77 |   return results;
78 | }
79 | 
80 | // Actually gather up the file list
81 | const allFiles = collectFiles(process.cwd());
82 | 
83 | /**
84 |  * Generate the final markdown content.
85 |  * We replicate the style:
86 |  *
87 |  * /path/to/file:
88 |  * --------------------------------------------------------------------------------
89 |  * 1 | ...
90 |  * 2 | ...
91 |  * --------------------------------------------------------------------------------
92 |  *
93 |  */
94 | function generateMarkdown(files) {
95 |   const lines = [];
96 | 
97 |   for (const file of files) {
98 |     // Turn absolute path into something relative
99 |     const relativePath = path.relative(process.cwd(), file);
100 |     const content = fs.readFileSync(file, "utf8");
101 | 
102 |     // Start of file block
103 |     lines.push(`/${relativePath}:`);
104 |     lines.push(
105 |       "--------------------------------------------------------------------------------"
106 |     );
107 | 
108 |     // Add line numbers
109 |     const fileLines = content.split("\n");
110 |     fileLines.forEach((line, i) => {
111 |       // +1 because line numbers start at 1
112 |       lines.push(`${i + 1} | ${line}`);
113 |     });
114 | 
115 |     lines.push("");
116 |     lines.push(
117 |       "--------------------------------------------------------------------------------"
118 |     );
119 |   }
120 | 
121 |   return lines.join("\n");
122 | }
123 | 
124 | // Build the final output
125 | const final = generateMarkdown(allFiles);
126 | 
127 | // Write to file if `-o/--output` was given, else print to stdout
128 | if (output) {
129 |   fs.writeFileSync(output, final, "utf8");
130 |   console.log(`All files are written to ${output}.`);
131 | } else {
132 |   console.log(final);
133 | }
134 | 

--------------------------------------------------------------------------------
/instruct.md:
--------------------------------------------------------------------------------
1 | Below is a complete working example of a small CLI tool called boltfetch that:
2 | 
3 | Recursively reads all files in the current directory.
4 | Respects patterns in a local .gitignore (if present).
5 | Outputs all file contents into a single Markdown file (or to stdout) with the same “numbered lines” format you showed in your example.
6 | You can publish this to npm (or just run it via npx) so that in a WebContainer (like StackBlitz) you can do:
7 | 
8 | bash
9 | Copy code
10 | npx boltfetch -o my-complete-source.md
11 | …and get a my-complete-source.md that contains all your files in the requested format.
12 | 
13 | File structure
14 | bash
15 | Copy code
16 | boltfetch/
17 |   ├─ package.json
18 |   ├─ index.js       # Main CLI logic
19 |   ├─ LICENSE        # MIT License (example)
20 |   ├─ README.md      # (optional)
21 |   └─ .gitignore     # (optional - if you want to ignore certain files)
22 | Below, you’ll find the complete source of each file.
23 | Feel free to rename any references if you like. This example uses the name boltfetch.
24 | 
25 | /package.json
26 | jsonc
27 | Copy code
28 | {
29 |   "name": "boltfetch",
30 |   "version": "1.0.0",
31 |   "description": "Fetches all files in the current directory and outputs them in a Markdown file.",
32 |   "bin": {
33 |     "boltfetch": "./index.js"
34 |   },
35 |   "type": "module",
36 |   "keywords": ["boltfetch", "cli", "markdown", "source-code"],
37 |   "author": "Your Name <you@example.com>",
38 |   "license": "MIT",
39 |   "dependencies": {
40 |     "gitignore-parser": "^0.1.6"
41 |   }
42 | }
43 | /LICENSE (example)
44 | kotlin
45 | Copy code
46 | MIT License
47 | 
48 | Copyright (c) 2025 ...
49 | 
50 | Permission is hereby granted, free of charge, to any person obtaining a copy of this software ...
51 | (Include your own license text as you wish.)
52 | 
53 | /README.md (optional)
54 | md
55 | Copy code
56 | # boltfetch
57 | 
58 | Recursively fetches all code files in the current directory, ignoring what’s in `.gitignore`,  
59 | then outputs them into a single Markdown file with line numbers.
60 | 
61 | ## Usage
62 | 
63 | ```bash
64 | npx boltfetch -o my-complete-source.md
65 | If -o (or --output) is not provided, it will print to stdout.
66 | 
67 | yaml
68 | Copy code
69 | 
70 | ---
71 | 
72 | ### `/.gitignore` (optional)
73 | 
74 | node_modules dist *.log .DS_Store
75 | 
76 | php
77 | Copy code
78 | 
79 | *(Adjust your ignore patterns as needed.)*
80 | 
81 | ---
82 | 
83 | ### `/index.js`
84 | 
85 | > **Important**: This file is the core logic of the CLI.  
86 | > It’s written in plain JS so it can run under Node immediately.
87 | 
88 | ```js
89 | #!/usr/bin/env node
90 | 
91 | import fs from "node:fs"
92 | import path from "node:path"
93 | import process from "node:process"
94 | import { fileURLToPath } from "node:url"
95 | 
96 | // We’ll use `gitignore-parser` to handle ignoring files
97 | import gitignoreParser from "gitignore-parser"
98 | 
99 | // Resolve current directory in ESM context
100 | const __filename = fileURLToPath(import.meta.url)
101 | const __dirname = path.dirname(__filename)
102 | 
103 | /**
104 |  * Simple function to parse CLI args:
105 |  * 
106 |  * -o, --output <file> : specify output filename 
107 |  */
108 | function parseArgs(argv) {
109 |   const result = {
110 |     output: null
111 |   }
112 |   for (let i = 2; i < argv.length; i++) {
113 |     const arg = argv[i]
114 |     if ((arg === "-o" || arg === "--output") && argv[i + 1]) {
115 |       result.output = argv[i + 1]
116 |       i++
117 |     }
118 |   }
119 |   return result
120 | }
121 | 
122 | const { output } = parseArgs(process.argv)
123 | 
124 | // Try reading .gitignore if it exists
125 | let isIgnored
126 | try {
127 |   const gitignoreContent = fs.readFileSync(
128 |     path.join(process.cwd(), ".gitignore"),
129 |     "utf8"
130 |   )
131 |   isIgnored = gitignoreParser.compile(gitignoreContent)
132 | } catch {
133 |   // .gitignore not found or unreadable
134 |   // fallback to a function that never ignores
135 |   isIgnored = () => false
136 | }
137 | 
138 | /**
139 |  * Recursively collect all files in the current working directory,
140 |  * ignoring anything matched by .gitignore (if present).
141 |  */
142 | function collectFiles(dir) {
143 |   let results = []
144 |   const list = fs.readdirSync(dir)
145 | 
146 |   for (const filename of list) {
147 |     // Full path
148 |     const filePath = path.join(dir, filename)
149 |     // Relative path from CWD (for ignoring logic)
150 |     const relPath = path.relative(process.cwd(), filePath)
151 | 
152 |     // If ignored by .gitignore, skip
153 |     if (isIgnored(relPath)) {
154 |       continue
155 |     }
156 | 
157 |     const stat = fs.statSync(filePath)
158 | 
159 |     if (stat.isDirectory()) {
160 |       // Recurse into subdirectory
161 |       results = results.concat(collectFiles(filePath))
162 |     } else {
163 |       // It's a file
164 |       results.push(filePath)
165 |     }
166 |   }
167 |   return results
168 | }
169 | 
170 | // Actually gather up the file list
171 | const allFiles = collectFiles(process.cwd())
172 | 
173 | /**
174 |  * Generate the final markdown content.
175 |  * We replicate the style:
176 |  *
177 |  * /path/to/file:
178 |  * --------------------------------------------------------------------------------
179 |  * 1 | ...
180 |  * 2 | ...
181 |  * --------------------------------------------------------------------------------
182 |  *
183 |  */
184 | function generateMarkdown(files) {
185 |   const lines = []
186 | 
187 |   for (const file of files) {
188 |     // Turn absolute path into something relative
189 |     const relativePath = path.relative(process.cwd(), file)
190 |     const content = fs.readFileSync(file, "utf8")
191 | 
192 |     // Start of file block
193 |     lines.push(`/${relativePath}:`)
194 |     lines.push("--------------------------------------------------------------------------------")
195 | 
196 |     // Add line numbers
197 |     const fileLines = content.split("\n")
198 |     fileLines.forEach((line, i) => {
199 |       // +1 because line numbers start at 1
200 |       lines.push(`${i + 1} | ${line}`)
201 |     })
202 | 
203 |     lines.push("")
204 |     lines.push("--------------------------------------------------------------------------------")
205 |   }
206 | 
207 |   return lines.join("\n")
208 | }
209 | 
210 | // Build the final output
211 | const final = generateMarkdown(allFiles)
212 | 
213 | // Write to file if `-o/--output` was given, else print to stdout
214 | if (output) {
215 |   fs.writeFileSync(output, final, "utf8")
216 |   console.log(`All files are written to ${output}.`)
217 | } else {
218 |   console.log(final)
219 | }
220 | How to Use Locally or in a WebContainer
221 | Install dependencies
222 | bash
223 | Copy code
224 | npm install
225 | Link (optional, for local testing)
226 | bash
227 | Copy code
228 | npm link
229 | # Now you can run `boltfetch` in this directory
230 | Or just run directly
231 | bash
232 | Copy code
233 | node index.js -o my-complete-source.md
234 | From a WebContainer (like StackBlitz):
235 | bash
236 | Copy code
237 | npx boltfetch -o my-complete-source.md
238 | This will create my-complete-source.md containing the entire project (except files ignored by .gitignore).
239 | Publish to npm
240 | If you want to publish this so that anyone can run npx boltfetch:
241 | 
242 | Make sure you have an npm account (and have run npm login).
243 | Bump the version in package.json as needed.
244 | Run:
245 | bash
246 | Copy code
247 | npm publish
248 | Now, from any environment:
249 | bash
250 | Copy code
251 | npx boltfetch -o my-complete-source.md
252 | will grab your published CLI and run it!
253 | 

--------------------------------------------------------------------------------
/output.md:
--------------------------------------------------------------------------------
1 | /.gitignore:
2 | --------------------------------------------------------------------------------
3 | 1 | node_modules/
4 | 2 | dist/
5 | 3 | *.log
6 | 4 | .DS_Store
7 | 5 | coverage/
8 | 6 | .env 
9 | 
10 | --------------------------------------------------------------------------------
11 | /LICENSE:
12 | --------------------------------------------------------------------------------
13 | 1 | MIT License
14 | 2 | 
15 | 3 | Copyright (c) 2024 boltfetch
16 | 4 | 
17 | 5 | Permission is hereby granted, free of charge, to any person obtaining a copy
18 | 6 | of this software and associated documentation files (the "Software"), to deal
19 | 7 | in the Software without restriction, including without limitation the rights
20 | 8 | to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
21 | 9 | copies of the Software, and to permit persons to whom the Software is
22 | 10 | furnished to do so, subject to the following conditions:
23 | 11 | 
24 | 12 | The above copyright notice and this permission notice shall be included in all
25 | 13 | copies or substantial portions of the Software.
26 | 14 | 
27 | 15 | THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
28 | 16 | IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
29 | 17 | FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
30 | 18 | AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
31 | 19 | LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
32 | 20 | OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
33 | 21 | SOFTWARE. 
34 | 
35 | --------------------------------------------------------------------------------
36 | /README.md:
37 | --------------------------------------------------------------------------------
38 | 1 | # boltfetch
39 | 2 | 
40 | 3 | Recursively fetches all code files in the current directory, ignoring what's in `.gitignore`,  
41 | 4 | then outputs them into a single Markdown file with line numbers.
42 | 5 | 
43 | 6 | ## Usage
44 | 7 | 
45 | 8 | ```bash
46 | 9 | npx boltfetch -o my-complete-source.md
47 | 10 | ```
48 | 11 | 
49 | 12 | If -o (or --output) is not provided, it will print to stdout.
50 | 13 | 
51 | 14 | ## Installation
52 | 15 | 
53 | 16 | You can run directly with npx:
54 | 17 | 
55 | 18 | ```bash
56 | 19 | npx boltfetch
57 | 20 | ```
58 | 21 | 
59 | 22 | Or install globally:
60 | 23 | 
61 | 24 | ```bash
62 | 25 | npm install -g boltfetch
63 | 26 | boltfetch -o output.md
64 | 27 | ```
65 | 28 | 
66 | 29 | ## License
67 | 30 | 
68 | 31 | MIT 
69 | 
70 | --------------------------------------------------------------------------------
71 | /asdf.md:
72 | --------------------------------------------------------------------------------
73 | 1 | asdddsaasd
74 | 
75 | --------------------------------------------------------------------------------
76 | /index.js:
77 | --------------------------------------------------------------------------------
78 | 1 | #!/usr/bin/env node
79 | 2 | 
80 | 3 | import fs from "node:fs";
81 | 4 | import path from "node:path";
82 | 5 | import process from "node:process";
83 | 6 | import { fileURLToPath } from "node:url";
84 | 7 | 
85 | 8 | // We'll use `ignore` to handle ignoring files
86 | 9 | import ignore from "ignore";
87 | 10 | 
88 | 11 | // Resolve current directory in ESM context
89 | 12 | const __filename = fileURLToPath(import.meta.url);
90 | 13 | const __dirname = path.dirname(__filename);
91 | 14 | 
92 | 15 | /**
93 | 16 |  * Simple function to parse CLI args:
94 | 17 |  *
95 | 18 |  * -o, --output <file> : specify output filename
96 | 19 |  */
97 | 20 | function parseArgs(argv) {
98 | 21 |   const result = {
99 | 22 |     output: null,
100 | 23 |   };
101 | 24 |   for (let i = 2; i < argv.length; i++) {
102 | 25 |     const arg = argv[i];
103 | 26 |     if ((arg === "-o" || arg === "--output") && argv[i + 1]) {
104 | 27 |       result.output = argv[i + 1];
105 | 28 |       i++;
106 | 29 |     }
107 | 30 |   }
108 | 31 |   return result;
109 | 32 | }
110 | 33 | 
111 | 34 | const { output } = parseArgs(process.argv);
112 | 35 | 
113 | 36 | // Try reading .gitignore if it exists
114 | 37 | const ig = ignore();
115 | 38 | try {
116 | 39 |   const gitignoreContent = fs.readFileSync(
117 | 40 |     path.join(process.cwd(), ".gitignore"),
118 | 41 |     "utf8"
119 | 42 |   );
120 | 43 |   ig.add(gitignoreContent);
121 | 44 | } catch {
122 | 45 |   // .gitignore not found or unreadable - that's fine
123 | 46 | }
124 | 47 | 
125 | 48 | /**
126 | 49 |  * Recursively collect all files in the current working directory,
127 | 50 |  * ignoring anything matched by .gitignore (if present).
128 | 51 |  */
129 | 52 | function collectFiles(dir) {
130 | 53 |   let results = [];
131 | 54 |   const list = fs.readdirSync(dir);
132 | 55 | 
133 | 56 |   for (const filename of list) {
134 | 57 |     // Full path
135 | 58 |     const filePath = path.join(dir, filename);
136 | 59 |     // Relative path from CWD (for ignoring logic)
137 | 60 |     const relPath = path.relative(process.cwd(), filePath);
138 | 61 | 
139 | 62 |     // If ignored by .gitignore, skip
140 | 63 |     if (ig.ignores(relPath)) {
141 | 64 |       continue;
142 | 65 |     }
143 | 66 | 
144 | 67 |     const stat = fs.statSync(filePath);
145 | 68 | 
146 | 69 |     if (stat.isDirectory()) {
147 | 70 |       // Recurse into subdirectory
148 | 71 |       results = results.concat(collectFiles(filePath));
149 | 72 |     } else {
150 | 73 |       // It's a file
151 | 74 |       results.push(filePath);
152 | 75 |     }
153 | 76 |   }
154 | 77 |   return results;
155 | 78 | }
156 | 79 | 
157 | 80 | // Actually gather up the file list
158 | 81 | const allFiles = collectFiles(process.cwd());
159 | 82 | 
160 | 83 | /**
161 | 84 |  * Generate the final markdown content.
162 | 85 |  * We replicate the style:
163 | 86 |  *
164 | 87 |  * /path/to/file:
165 | 88 |  * --------------------------------------------------------------------------------
166 | 89 |  * 1 | ...
167 | 90 |  * 2 | ...
168 | 91 |  * --------------------------------------------------------------------------------
169 | 92 |  *
170 | 93 |  */
171 | 94 | function generateMarkdown(files) {
172 | 95 |   const lines = [];
173 | 96 | 
174 | 97 |   for (const file of files) {
175 | 98 |     // Turn absolute path into something relative
176 | 99 |     const relativePath = path.relative(process.cwd(), file);
177 | 100 |     const content = fs.readFileSync(file, "utf8");
178 | 101 | 
179 | 102 |     // Start of file block
180 | 103 |     lines.push(`/${relativePath}:`);
181 | 104 |     lines.push(
182 | 105 |       "--------------------------------------------------------------------------------"
183 | 106 |     );
184 | 107 | 
185 | 108 |     // Add line numbers
186 | 109 |     const fileLines = content.split("\n");
187 | 110 |     fileLines.forEach((line, i) => {
188 | 111 |       // +1 because line numbers start at 1
189 | 112 |       lines.push(`${i + 1} | ${line}`);
190 | 113 |     });
191 | 114 | 
192 | 115 |     lines.push("");
193 | 116 |     lines.push(
194 | 117 |       "--------------------------------------------------------------------------------"
195 | 118 |     );
196 | 119 |   }
197 | 120 | 
198 | 121 |   return lines.join("\n");
199 | 122 | }
200 | 123 | 
201 | 124 | // Build the final output
202 | 125 | const final = generateMarkdown(allFiles);
203 | 126 | 
204 | 127 | // Write to file if `-o/--output` was given, else print to stdout
205 | 128 | if (output) {
206 | 129 |   fs.writeFileSync(output, final, "utf8");
207 | 130 |   console.log(`All files are written to ${output}.`);
208 | 131 | } else {
209 | 132 |   console.log(final);
210 | 133 | }
211 | 134 | 
212 | 
213 | --------------------------------------------------------------------------------
214 | /instruct.md:
215 | --------------------------------------------------------------------------------
216 | 1 | Below is a complete working example of a small CLI tool called boltfetch that:
217 | 2 | 
218 | 3 | Recursively reads all files in the current directory.
219 | 4 | Respects patterns in a local .gitignore (if present).
220 | 5 | Outputs all file contents into a single Markdown file (or to stdout) with the same “numbered lines” format you showed in your example.
221 | 6 | You can publish this to npm (or just run it via npx) so that in a WebContainer (like StackBlitz) you can do:
222 | 7 | 
223 | 8 | bash
224 | 9 | Copy code
225 | 10 | npx boltfetch -o my-complete-source.md
226 | 11 | …and get a my-complete-source.md that contains all your files in the requested format.
227 | 12 | 
228 | 13 | File structure
229 | 14 | bash
230 | 15 | Copy code
231 | 16 | boltfetch/
232 | 17 |   ├─ package.json
233 | 18 |   ├─ index.js       # Main CLI logic
234 | 19 |   ├─ LICENSE        # MIT License (example)
235 | 20 |   ├─ README.md      # (optional)
236 | 21 |   └─ .gitignore     # (optional - if you want to ignore certain files)
237 | 22 | Below, you’ll find the complete source of each file.
238 | 23 | Feel free to rename any references if you like. This example uses the name boltfetch.
239 | 24 | 
240 | 25 | /package.json
241 | 26 | jsonc
242 | 27 | Copy code
243 | 28 | {
244 | 29 |   "name": "boltfetch",
245 | 30 |   "version": "1.0.0",
246 | 31 |   "description": "Fetches all files in the current directory and outputs them in a Markdown file.",
247 | 32 |   "bin": {
248 | 33 |     "boltfetch": "./index.js"
249 | 34 |   },
250 | 35 |   "type": "module",
251 | 36 |   "keywords": ["boltfetch", "cli", "markdown", "source-code"],
252 | 37 |   "author": "Your Name <you@example.com>",
253 | 38 |   "license": "MIT",
254 | 39 |   "dependencies": {
255 | 40 |     "gitignore-parser": "^0.1.6"
256 | 41 |   }
257 | 42 | }
258 | 43 | /LICENSE (example)
259 | 44 | kotlin
260 | 45 | Copy code
261 | 46 | MIT License
262 | 47 | 
263 | 48 | Copyright (c) 2025 ...
264 | 49 | 
265 | 50 | Permission is hereby granted, free of charge, to any person obtaining a copy of this software ...
266 | 51 | (Include your own license text as you wish.)
267 | 52 | 
268 | 53 | /README.md (optional)
269 | 54 | md
270 | 55 | Copy code
271 | 56 | # boltfetch
272 | 57 | 
273 | 58 | Recursively fetches all code files in the current directory, ignoring what’s in `.gitignore`,  
274 | 59 | then outputs them into a single Markdown file with line numbers.
275 | 60 | 
276 | 61 | ## Usage
277 | 62 | 
278 | 63 | ```bash
279 | 64 | npx boltfetch -o my-complete-source.md
280 | 65 | If -o (or --output) is not provided, it will print to stdout.
281 | 66 | 
282 | 67 | yaml
283 | 68 | Copy code
284 | 69 | 
285 | 70 | ---
286 | 71 | 
287 | 72 | ### `/.gitignore` (optional)
288 | 73 | 
289 | 74 | node_modules dist *.log .DS_Store
290 | 75 | 
291 | 76 | php
292 | 77 | Copy code
293 | 78 | 
294 | 79 | *(Adjust your ignore patterns as needed.)*
295 | 80 | 
296 | 81 | ---
297 | 82 | 
298 | 83 | ### `/index.js`
299 | 84 | 
300 | 85 | > **Important**: This file is the core logic of the CLI.  
301 | 86 | > It’s written in plain JS so it can run under Node immediately.
302 | 87 | 
303 | 88 | ```js
304 | 89 | #!/usr/bin/env node
305 | 90 | 
306 | 91 | import fs from "node:fs"
307 | 92 | import path from "node:path"
308 | 93 | import process from "node:process"
309 | 94 | import { fileURLToPath } from "node:url"
310 | 95 | 
311 | 96 | // We’ll use `gitignore-parser` to handle ignoring files
312 | 97 | import gitignoreParser from "gitignore-parser"
313 | 98 | 
314 | 99 | // Resolve current directory in ESM context
315 | 100 | const __filename = fileURLToPath(import.meta.url)
316 | 101 | const __dirname = path.dirname(__filename)
317 | 102 | 
318 | 103 | /**
319 | 104 |  * Simple function to parse CLI args:
320 | 105 |  * 
321 | 106 |  * -o, --output <file> : specify output filename 
322 | 107 |  */
323 | 108 | function parseArgs(argv) {
324 | 109 |   const result = {
325 | 110 |     output: null
326 | 111 |   }
327 | 112 |   for (let i = 2; i < argv.length; i++) {
328 | 113 |     const arg = argv[i]
329 | 114 |     if ((arg === "-o" || arg === "--output") && argv[i + 1]) {
330 | 115 |       result.output = argv[i + 1]
331 | 116 |       i++
332 | 117 |     }
333 | 118 |   }
334 | 119 |   return result
335 | 120 | }
336 | 121 | 
337 | 122 | const { output } = parseArgs(process.argv)
338 | 123 | 
339 | 124 | // Try reading .gitignore if it exists
340 | 125 | let isIgnored
341 | 126 | try {
342 | 127 |   const gitignoreContent = fs.readFileSync(
343 | 128 |     path.join(process.cwd(), ".gitignore"),
344 | 129 |     "utf8"
345 | 130 |   )
346 | 131 |   isIgnored = gitignoreParser.compile(gitignoreContent)
347 | 132 | } catch {
348 | 133 |   // .gitignore not found or unreadable
349 | 134 |   // fallback to a function that never ignores
350 | 135 |   isIgnored = () => false
351 | 136 | }
352 | 137 | 
353 | 138 | /**
354 | 139 |  * Recursively collect all files in the current working directory,
355 | 140 |  * ignoring anything matched by .gitignore (if present).
356 | 141 |  */
357 | 142 | function collectFiles(dir) {
358 | 143 |   let results = []
359 | 144 |   const list = fs.readdirSync(dir)
360 | 145 | 
361 | 146 |   for (const filename of list) {
362 | 147 |     // Full path
363 | 148 |     const filePath = path.join(dir, filename)
364 | 149 |     // Relative path from CWD (for ignoring logic)
365 | 150 |     const relPath = path.relative(process.cwd(), filePath)
366 | 151 | 
367 | 152 |     // If ignored by .gitignore, skip
368 | 153 |     if (isIgnored(relPath)) {
369 | 154 |       continue
370 | 155 |     }
371 | 156 | 
372 | 157 |     const stat = fs.statSync(filePath)
373 | 158 | 
374 | 159 |     if (stat.isDirectory()) {
375 | 160 |       // Recurse into subdirectory
376 | 161 |       results = results.concat(collectFiles(filePath))
377 | 162 |     } else {
378 | 163 |       // It's a file
379 | 164 |       results.push(filePath)
380 | 165 |     }
381 | 166 |   }
382 | 167 |   return results
383 | 168 | }
384 | 169 | 
385 | 170 | // Actually gather up the file list
386 | 171 | const allFiles = collectFiles(process.cwd())
387 | 172 | 
388 | 173 | /**
389 | 174 |  * Generate the final markdown content.
390 | 175 |  * We replicate the style:
391 | 176 |  *
392 | 177 |  * /path/to/file:
393 | 178 |  * --------------------------------------------------------------------------------
394 | 179 |  * 1 | ...
395 | 180 |  * 2 | ...
396 | 181 |  * --------------------------------------------------------------------------------
397 | 182 |  *
398 | 183 |  */
399 | 184 | function generateMarkdown(files) {
400 | 185 |   const lines = []
401 | 186 | 
402 | 187 |   for (const file of files) {
403 | 188 |     // Turn absolute path into something relative
404 | 189 |     const relativePath = path.relative(process.cwd(), file)
405 | 190 |     const content = fs.readFileSync(file, "utf8")
406 | 191 | 
407 | 192 |     // Start of file block
408 | 193 |     lines.push(`/${relativePath}:`)
409 | 194 |     lines.push("--------------------------------------------------------------------------------")
410 | 195 | 
411 | 196 |     // Add line numbers
412 | 197 |     const fileLines = content.split("\n")
413 | 198 |     fileLines.forEach((line, i) => {
414 | 199 |       // +1 because line numbers start at 1
415 | 200 |       lines.push(`${i + 1} | ${line}`)
416 | 201 |     })
417 | 202 | 
418 | 203 |     lines.push("")
419 | 204 |     lines.push("--------------------------------------------------------------------------------")
420 | 205 |   }
421 | 206 | 
422 | 207 |   return lines.join("\n")
423 | 208 | }
424 | 209 | 
425 | 210 | // Build the final output
426 | 211 | const final = generateMarkdown(allFiles)
427 | 212 | 
428 | 213 | // Write to file if `-o/--output` was given, else print to stdout
429 | 214 | if (output) {
430 | 215 |   fs.writeFileSync(output, final, "utf8")
431 | 216 |   console.log(`All files are written to ${output}.`)
432 | 217 | } else {
433 | 218 |   console.log(final)
434 | 219 | }
435 | 220 | How to Use Locally or in a WebContainer
436 | 221 | Install dependencies
437 | 222 | bash
438 | 223 | Copy code
439 | 224 | npm install
440 | 225 | Link (optional, for local testing)
441 | 226 | bash
442 | 227 | Copy code
443 | 228 | npm link
444 | 229 | # Now you can run `boltfetch` in this directory
445 | 230 | Or just run directly
446 | 231 | bash
447 | 232 | Copy code
448 | 233 | node index.js -o my-complete-source.md
449 | 234 | From a WebContainer (like StackBlitz):
450 | 235 | bash
451 | 236 | Copy code
452 | 237 | npx boltfetch -o my-complete-source.md
453 | 238 | This will create my-complete-source.md containing the entire project (except files ignored by .gitignore).
454 | 239 | Publish to npm
455 | 240 | If you want to publish this so that anyone can run npx boltfetch:
456 | 241 | 
457 | 242 | Make sure you have an npm account (and have run npm login).
458 | 243 | Bump the version in package.json as needed.
459 | 244 | Run:
460 | 245 | bash
461 | 246 | Copy code
462 | 247 | npm publish
463 | 248 | Now, from any environment:
464 | 249 | bash
465 | 250 | Copy code
466 | 251 | npx boltfetch -o my-complete-source.md
467 | 252 | will grab your published CLI and run it!
468 | 253 | 
469 | 
470 | --------------------------------------------------------------------------------
471 | /output.md:
472 | --------------------------------------------------------------------------------
473 | 1 | /.gitignore:
474 | 2 | --------------------------------------------------------------------------------
475 | 3 | 1 | node_modules/
476 | 4 | 2 | dist/
477 | 5 | 3 | *.log
478 | 6 | 4 | .DS_Store
479 | 7 | 5 | coverage/
480 | 8 | 6 | .env 
481 | 9 | 
482 | 10 | --------------------------------------------------------------------------------
483 | 11 | /LICENSE:
484 | 12 | --------------------------------------------------------------------------------
485 | 13 | 1 | MIT License
486 | 14 | 2 | 
487 | 15 | 3 | Copyright (c) 2024 boltfetch
488 | 16 | 4 | 
489 | 17 | 5 | Permission is hereby granted, free of charge, to any person obtaining a copy
490 | 18 | 6 | of this software and associated documentation files (the "Software"), to deal
491 | 19 | 7 | in the Software without restriction, including without limitation the rights
492 | 20 | 8 | to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
493 | 21 | 9 | copies of the Software, and to permit persons to whom the Software is
494 | 22 | 10 | furnished to do so, subject to the following conditions:
495 | 23 | 11 | 
496 | 24 | 12 | The above copyright notice and this permission notice shall be included in all
497 | 25 | 13 | copies or substantial portions of the Software.
498 | 26 | 14 | 
499 | 27 | 15 | THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
500 | 28 | 16 | IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
501 | 29 | 17 | FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
502 | 30 | 18 | AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
503 | 31 | 19 | LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
504 | 32 | 20 | OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
505 | 33 | 21 | SOFTWARE. 
506 | 34 | 
507 | 35 | --------------------------------------------------------------------------------
508 | 36 | /README.md:
509 | 37 | --------------------------------------------------------------------------------
510 | 38 | 1 | # boltfetch
511 | 39 | 2 | 
512 | 40 | 3 | Recursively fetches all code files in the current directory, ignoring what's in `.gitignore`,  
513 | 41 | 4 | then outputs them into a single Markdown file with line numbers.
514 | 42 | 5 | 
515 | 43 | 6 | ## Usage
516 | 44 | 7 | 
517 | 45 | 8 | ```bash
518 | 46 | 9 | npx boltfetch -o my-complete-source.md
519 | 47 | 10 | ```
520 | 48 | 11 | 
521 | 49 | 12 | If -o (or --output) is not provided, it will print to stdout.
522 | 50 | 13 | 
523 | 51 | 14 | ## Installation
524 | 52 | 15 | 
525 | 53 | 16 | You can run directly with npx:
526 | 54 | 17 | 
527 | 55 | 18 | ```bash
528 | 56 | 19 | npx boltfetch
529 | 57 | 20 | ```
530 | 58 | 21 | 
531 | 59 | 22 | Or install globally:
532 | 60 | 23 | 
533 | 61 | 24 | ```bash
534 | 62 | 25 | npm install -g boltfetch
535 | 63 | 26 | boltfetch -o output.md
536 | 64 | 27 | ```
537 | 65 | 28 | 
538 | 66 | 29 | ## License
539 | 67 | 30 | 
540 | 68 | 31 | MIT 
541 | 69 | 
542 | 70 | --------------------------------------------------------------------------------
543 | 71 | /asdf.md:
544 | 72 | --------------------------------------------------------------------------------
545 | 73 | 1 | 
546 | 74 | 
547 | 75 | --------------------------------------------------------------------------------
548 | 76 | /index.js:
549 | 77 | --------------------------------------------------------------------------------
550 | 78 | 1 | #!/usr/bin/env node
551 | 79 | 2 | 
552 | 80 | 3 | import fs from "node:fs";
553 | 81 | 4 | import path from "node:path";
554 | 82 | 5 | import process from "node:process";
555 | 83 | 6 | import { fileURLToPath } from "node:url";
556 | 84 | 7 | 
557 | 85 | 8 | // We'll use `ignore` to handle ignoring files
558 | 86 | 9 | import ignore from "ignore";
559 | 87 | 10 | 
560 | 88 | 11 | // Resolve current directory in ESM context
561 | 89 | 12 | const __filename = fileURLToPath(import.meta.url);
562 | 90 | 13 | const __dirname = path.dirname(__filename);
563 | 91 | 14 | 
564 | 92 | 15 | /**
565 | 93 | 16 |  * Simple function to parse CLI args:
566 | 94 | 17 |  *
567 | 95 | 18 |  * -o, --output <file> : specify output filename
568 | 96 | 19 |  */
569 | 97 | 20 | function parseArgs(argv) {
570 | 98 | 21 |   const result = {
571 | 99 | 22 |     output: null,
572 | 100 | 23 |   };
573 | 101 | 24 |   for (let i = 2; i < argv.length; i++) {
574 | 102 | 25 |     const arg = argv[i];
575 | 103 | 26 |     if ((arg === "-o" || arg === "--output") && argv[i + 1]) {
576 | 104 | 27 |       result.output = argv[i + 1];
577 | 105 | 28 |       i++;
578 | 106 | 29 |     }
579 | 107 | 30 |   }
580 | 108 | 31 |   return result;
581 | 109 | 32 | }
582 | 110 | 33 | 
583 | 111 | 34 | const { output } = parseArgs(process.argv);
584 | 112 | 35 | 
585 | 113 | 36 | // Try reading .gitignore if it exists
586 | 114 | 37 | const ig = ignore();
587 | 115 | 38 | try {
588 | 116 | 39 |   const gitignoreContent = fs.readFileSync(
589 | 117 | 40 |     path.join(process.cwd(), ".gitignore"),
590 | 118 | 41 |     "utf8"
591 | 119 | 42 |   );
592 | 120 | 43 |   ig.add(gitignoreContent);
593 | 121 | 44 | } catch {
594 | 122 | 45 |   // .gitignore not found or unreadable - that's fine
595 | 123 | 46 | }
596 | 124 | 47 | 
597 | 125 | 48 | /**
598 | 126 | 49 |  * Recursively collect all files in the current working directory,
599 | 127 | 50 |  * ignoring anything matched by .gitignore (if present).
600 | 128 | 51 |  */
601 | 129 | 52 | function collectFiles(dir) {
602 | 130 | 53 |   let results = [];
603 | 131 | 54 |   const list = fs.readdirSync(dir);
604 | 132 | 55 | 
605 | 133 | 56 |   for (const filename of list) {
606 | 134 | 57 |     // Full path
607 | 135 | 58 |     const filePath = path.join(dir, filename);
608 | 136 | 59 |     // Relative path from CWD (for ignoring logic)
609 | 137 | 60 |     const relPath = path.relative(process.cwd(), filePath);
610 | 138 | 61 | 
611 | 139 | 62 |     // If ignored by .gitignore, skip
612 | 140 | 63 |     if (ig.ignores(relPath)) {
613 | 141 | 64 |       continue;
614 | 142 | 65 |     }
615 | 143 | 66 | 
616 | 144 | 67 |     const stat = fs.statSync(filePath);
617 | 145 | 68 | 
618 | 146 | 69 |     if (stat.isDirectory()) {
619 | 147 | 70 |       // Recurse into subdirectory
620 | 148 | 71 |       results = results.concat(collectFiles(filePath));
621 | 149 | 72 |     } else {
622 | 150 | 73 |       // It's a file
623 | 151 | 74 |       results.push(filePath);
624 | 152 | 75 |     }
625 | 153 | 76 |   }
626 | 154 | 77 |   return results;
627 | 155 | 78 | }
628 | 156 | 79 | 
629 | 157 | 80 | // Actually gather up the file list
630 | 158 | 81 | const allFiles = collectFiles(process.cwd());
631 | 159 | 82 | 
632 | 160 | 83 | /**
633 | 161 | 84 |  * Generate the final markdown content.
634 | 162 | 85 |  * We replicate the style:
635 | 163 | 86 |  *
636 | 164 | 87 |  * /path/to/file:
637 | 165 | 88 |  * --------------------------------------------------------------------------------
638 | 166 | 89 |  * 1 | ...
639 | 167 | 90 |  * 2 | ...
640 | 168 | 91 |  * --------------------------------------------------------------------------------
641 | 169 | 92 |  *
642 | 170 | 93 |  */
643 | 171 | 94 | function generateMarkdown(files) {
644 | 172 | 95 |   const lines = [];
645 | 173 | 96 | 
646 | 174 | 97 |   for (const file of files) {
647 | 175 | 98 |     // Turn absolute path into something relative
648 | 176 | 99 |     const relativePath = path.relative(process.cwd(), file);
649 | 177 | 100 |     const content = fs.readFileSync(file, "utf8");
650 | 178 | 101 | 
651 | 179 | 102 |     // Start of file block
652 | 180 | 103 |     lines.push(`/${relativePath}:`);
653 | 181 | 104 |     lines.push(
654 | 182 | 105 |       "--------------------------------------------------------------------------------"
655 | 183 | 106 |     );
656 | 184 | 107 | 
657 | 185 | 108 |     // Add line numbers
658 | 186 | 109 |     const fileLines = content.split("\n");
659 | 187 | 110 |     fileLines.forEach((line, i) => {
660 | 188 | 111 |       // +1 because line numbers start at 1
661 | 189 | 112 |       lines.push(`${i + 1} | ${line}`);
662 | 190 | 113 |     });
663 | 191 | 114 | 
664 | 192 | 115 |     lines.push("");
665 | 193 | 116 |     lines.push(
666 | 194 | 117 |       "--------------------------------------------------------------------------------"
667 | 195 | 118 |     );
668 | 196 | 119 |   }
669 | 197 | 120 | 
670 | 198 | 121 |   return lines.join("\n");
671 | 199 | 122 | }
672 | 200 | 123 | 
673 | 201 | 124 | // Build the final output
674 | 202 | 125 | const final = generateMarkdown(allFiles);
675 | 203 | 126 | 
676 | 204 | 127 | // Write to file if `-o/--output` was given, else print to stdout
677 | 205 | 128 | if (output) {
678 | 206 | 129 |   fs.writeFileSync(output, final, "utf8");
679 | 207 | 130 |   console.log(`All files are written to ${output}.`);
680 | 208 | 131 | } else {
681 | 209 | 132 |   console.log(final);
682 | 210 | 133 | }
683 | 211 | 134 | 
684 | 212 | 
685 | 213 | --------------------------------------------------------------------------------
686 | 214 | /instruct.md:
687 | 215 | --------------------------------------------------------------------------------
688 | 216 | 1 | Below is a complete working example of a small CLI tool called boltfetch that:
689 | 217 | 2 | 
690 | 218 | 3 | Recursively reads all files in the current directory.
691 | 219 | 4 | Respects patterns in a local .gitignore (if present).
692 | 220 | 5 | Outputs all file contents into a single Markdown file (or to stdout) with the same “numbered lines” format you showed in your example.
693 | 221 | 6 | You can publish this to npm (or just run it via npx) so that in a WebContainer (like StackBlitz) you can do:
694 | 222 | 7 | 
695 | 223 | 8 | bash
696 | 224 | 9 | Copy code
697 | 225 | 10 | npx boltfetch -o my-complete-source.md
698 | 226 | 11 | …and get a my-complete-source.md that contains all your files in the requested format.
699 | 227 | 12 | 
700 | 228 | 13 | File structure
701 | 229 | 14 | bash
702 | 230 | 15 | Copy code
703 | 231 | 16 | boltfetch/
704 | 232 | 17 |   ├─ package.json
705 | 233 | 18 |   ├─ index.js       # Main CLI logic
706 | 234 | 19 |   ├─ LICENSE        # MIT License (example)
707 | 235 | 20 |   ├─ README.md      # (optional)
708 | 236 | 21 |   └─ .gitignore     # (optional - if you want to ignore certain files)
709 | 237 | 22 | Below, you’ll find the complete source of each file.
710 | 238 | 23 | Feel free to rename any references if you like. This example uses the name boltfetch.
711 | 239 | 24 | 
712 | 240 | 25 | /package.json
713 | 241 | 26 | jsonc
714 | 242 | 27 | Copy code
715 | 243 | 28 | {
716 | 244 | 29 |   "name": "boltfetch",
717 | 245 | 30 |   "version": "1.0.0",
718 | 246 | 31 |   "description": "Fetches all files in the current directory and outputs them in a Markdown file.",
719 | 247 | 32 |   "bin": {
720 | 248 | 33 |     "boltfetch": "./index.js"
721 | 249 | 34 |   },
722 | 250 | 35 |   "type": "module",
723 | 251 | 36 |   "keywords": ["boltfetch", "cli", "markdown", "source-code"],
724 | 252 | 37 |   "author": "Your Name <you@example.com>",
725 | 253 | 38 |   "license": "MIT",
726 | 254 | 39 |   "dependencies": {
727 | 255 | 40 |     "gitignore-parser": "^0.1.6"
728 | 256 | 41 |   }
729 | 257 | 42 | }
730 | 258 | 43 | /LICENSE (example)
731 | 259 | 44 | kotlin
732 | 260 | 45 | Copy code
733 | 261 | 46 | MIT License
734 | 262 | 47 | 
735 | 263 | 48 | Copyright (c) 2025 ...
736 | 264 | 49 | 
737 | 265 | 50 | Permission is hereby granted, free of charge, to any person obtaining a copy of this software ...
738 | 266 | 51 | (Include your own license text as you wish.)
739 | 267 | 52 | 
740 | 268 | 53 | /README.md (optional)
741 | 269 | 54 | md
742 | 270 | 55 | Copy code
743 | 271 | 56 | # boltfetch
744 | 272 | 57 | 
745 | 273 | 58 | Recursively fetches all code files in the current directory, ignoring what’s in `.gitignore`,  
746 | 274 | 59 | then outputs them into a single Markdown file with line numbers.
747 | 275 | 60 | 
748 | 276 | 61 | ## Usage
749 | 277 | 62 | 
750 | 278 | 63 | ```bash
751 | 279 | 64 | npx boltfetch -o my-complete-source.md
752 | 280 | 65 | If -o (or --output) is not provided, it will print to stdout.
753 | 281 | 66 | 
754 | 282 | 67 | yaml
755 | 283 | 68 | Copy code
756 | 284 | 69 | 
757 | 285 | 70 | ---
758 | 286 | 71 | 
759 | 287 | 72 | ### `/.gitignore` (optional)
760 | 288 | 73 | 
761 | 289 | 74 | node_modules dist *.log .DS_Store
762 | 290 | 75 | 
763 | 291 | 76 | php
764 | 292 | 77 | Copy code
765 | 293 | 78 | 
766 | 294 | 79 | *(Adjust your ignore patterns as needed.)*
767 | 295 | 80 | 
768 | 296 | 81 | ---
769 | 297 | 82 | 
770 | 298 | 83 | ### `/index.js`
771 | 299 | 84 | 
772 | 300 | 85 | > **Important**: This file is the core logic of the CLI.  
773 | 301 | 86 | > It’s written in plain JS so it can run under Node immediately.
774 | 302 | 87 | 
775 | 303 | 88 | ```js
776 | 304 | 89 | #!/usr/bin/env node
777 | 305 | 90 | 
778 | 306 | 91 | import fs from "node:fs"
779 | 307 | 92 | import path from "node:path"
780 | 308 | 93 | import process from "node:process"
781 | 309 | 94 | import { fileURLToPath } from "node:url"
782 | 310 | 95 | 
783 | 311 | 96 | // We’ll use `gitignore-parser` to handle ignoring files
784 | 312 | 97 | import gitignoreParser from "gitignore-parser"
785 | 313 | 98 | 
786 | 314 | 99 | // Resolve current directory in ESM context
787 | 315 | 100 | const __filename = fileURLToPath(import.meta.url)
788 | 316 | 101 | const __dirname = path.dirname(__filename)
789 | 317 | 102 | 
790 | 318 | 103 | /**
791 | 319 | 104 |  * Simple function to parse CLI args:
792 | 320 | 105 |  * 
793 | 321 | 106 |  * -o, --output <file> : specify output filename 
794 | 322 | 107 |  */
795 | 323 | 108 | function parseArgs(argv) {
796 | 324 | 109 |   const result = {
797 | 325 | 110 |     output: null
798 | 326 | 111 |   }
799 | 327 | 112 |   for (let i = 2; i < argv.length; i++) {
800 | 328 | 113 |     const arg = argv[i]
801 | 329 | 114 |     if ((arg === "-o" || arg === "--output") && argv[i + 1]) {
802 | 330 | 115 |       result.output = argv[i + 1]
803 | 331 | 116 |       i++
804 | 332 | 117 |     }
805 | 333 | 118 |   }
806 | 334 | 119 |   return result
807 | 335 | 120 | }
808 | 336 | 121 | 
809 | 337 | 122 | const { output } = parseArgs(process.argv)
810 | 338 | 123 | 
811 | 339 | 124 | // Try reading .gitignore if it exists
812 | 340 | 125 | let isIgnored
813 | 341 | 126 | try {
814 | 342 | 127 |   const gitignoreContent = fs.readFileSync(
815 | 343 | 128 |     path.join(process.cwd(), ".gitignore"),
816 | 344 | 129 |     "utf8"
817 | 345 | 130 |   )
818 | 346 | 131 |   isIgnored = gitignoreParser.compile(gitignoreContent)
819 | 347 | 132 | } catch {
820 | 348 | 133 |   // .gitignore not found or unreadable
821 | 349 | 134 |   // fallback to a function that never ignores
822 | 350 | 135 |   isIgnored = () => false
823 | 351 | 136 | }
824 | 352 | 137 | 
825 | 353 | 138 | /**
826 | 354 | 139 |  * Recursively collect all files in the current working directory,
827 | 355 | 140 |  * ignoring anything matched by .gitignore (if present).
828 | 356 | 141 |  */
829 | 357 | 142 | function collectFiles(dir) {
830 | 358 | 143 |   let results = []
831 | 359 | 144 |   const list = fs.readdirSync(dir)
832 | 360 | 145 | 
833 | 361 | 146 |   for (const filename of list) {
834 | 362 | 147 |     // Full path
835 | 363 | 148 |     const filePath = path.join(dir, filename)
836 | 364 | 149 |     // Relative path from CWD (for ignoring logic)
837 | 365 | 150 |     const relPath = path.relative(process.cwd(), filePath)
838 | 366 | 151 | 
839 | 367 | 152 |     // If ignored by .gitignore, skip
840 | 368 | 153 |     if (isIgnored(relPath)) {
841 | 369 | 154 |       continue
842 | 370 | 155 |     }
843 | 371 | 156 | 
844 | 372 | 157 |     const stat = fs.statSync(filePath)
845 | 373 | 158 | 
846 | 374 | 159 |     if (stat.isDirectory()) {
847 | 375 | 160 |       // Recurse into subdirectory
848 | 376 | 161 |       results = results.concat(collectFiles(filePath))
849 | 377 | 162 |     } else {
850 | 378 | 163 |       // It's a file
851 | 379 | 164 |       results.push(filePath)
852 | 380 | 165 |     }
853 | 381 | 166 |   }
854 | 382 | 167 |   return results
855 | 383 | 168 | }
856 | 384 | 169 | 
857 | 385 | 170 | // Actually gather up the file list
858 | 386 | 171 | const allFiles = collectFiles(process.cwd())
859 | 387 | 172 | 
860 | 388 | 173 | /**
861 | 389 | 174 |  * Generate the final markdown content.
862 | 390 | 175 |  * We replicate the style:
863 | 391 | 176 |  *
864 | 392 | 177 |  * /path/to/file:
865 | 393 | 178 |  * --------------------------------------------------------------------------------
866 | 394 | 179 |  * 1 | ...
867 | 395 | 180 |  * 2 | ...
868 | 396 | 181 |  * --------------------------------------------------------------------------------
869 | 397 | 182 |  *
870 | 398 | 183 |  */
871 | 399 | 184 | function generateMarkdown(files) {
872 | 400 | 185 |   const lines = []
873 | 401 | 186 | 
874 | 402 | 187 |   for (const file of files) {
875 | 403 | 188 |     // Turn absolute path into something relative
876 | 404 | 189 |     const relativePath = path.relative(process.cwd(), file)
877 | 405 | 190 |     const content = fs.readFileSync(file, "utf8")
878 | 406 | 191 | 
879 | 407 | 192 |     // Start of file block
880 | 408 | 193 |     lines.push(`/${relativePath}:`)
881 | 409 | 194 |     lines.push("--------------------------------------------------------------------------------")
882 | 410 | 195 | 
883 | 411 | 196 |     // Add line numbers
884 | 412 | 197 |     const fileLines = content.split("\n")
885 | 413 | 198 |     fileLines.forEach((line, i) => {
886 | 414 | 199 |       // +1 because line numbers start at 1
887 | 415 | 200 |       lines.push(`${i + 1} | ${line}`)
888 | 416 | 201 |     })
889 | 417 | 202 | 
890 | 418 | 203 |     lines.push("")
891 | 419 | 204 |     lines.push("--------------------------------------------------------------------------------")
892 | 420 | 205 |   }
893 | 421 | 206 | 
894 | 422 | 207 |   return lines.join("\n")
895 | 423 | 208 | }
896 | 424 | 209 | 
897 | 425 | 210 | // Build the final output
898 | 426 | 211 | const final = generateMarkdown(allFiles)
899 | 427 | 212 | 
900 | 428 | 213 | // Write to file if `-o/--output` was given, else print to stdout
901 | 429 | 214 | if (output) {
902 | 430 | 215 |   fs.writeFileSync(output, final, "utf8")
903 | 431 | 216 |   console.log(`All files are written to ${output}.`)
904 | 432 | 217 | } else {
905 | 433 | 218 |   console.log(final)
906 | 434 | 219 | }
907 | 435 | 220 | How to Use Locally or in a WebContainer
908 | 436 | 221 | Install dependencies
909 | 437 | 222 | bash
910 | 438 | 223 | Copy code
911 | 439 | 224 | npm install
912 | 440 | 225 | Link (optional, for local testing)
913 | 441 | 226 | bash
914 | 442 | 227 | Copy code
915 | 443 | 228 | npm link
916 | 444 | 229 | # Now you can run `boltfetch` in this directory
917 | 445 | 230 | Or just run directly
918 | 446 | 231 | bash
919 | 447 | 232 | Copy code
920 | 448 | 233 | node index.js -o my-complete-source.md
921 | 449 | 234 | From a WebContainer (like StackBlitz):
922 | 450 | 235 | bash
923 | 451 | 236 | Copy code
924 | 452 | 237 | npx boltfetch -o my-complete-source.md
925 | 453 | 238 | This will create my-complete-source.md containing the entire project (except files ignored by .gitignore).
926 | 454 | 239 | Publish to npm
927 | 455 | 240 | If you want to publish this so that anyone can run npx boltfetch:
928 | 456 | 241 | 
929 | 457 | 242 | Make sure you have an npm account (and have run npm login).
930 | 458 | 243 | Bump the version in package.json as needed.
931 | 459 | 244 | Run:
932 | 460 | 245 | bash
933 | 461 | 246 | Copy code
934 | 462 | 247 | npm publish
935 | 463 | 248 | Now, from any environment:
936 | 464 | 249 | bash
937 | 465 | 250 | Copy code
938 | 466 | 251 | npx boltfetch -o my-complete-source.md
939 | 467 | 252 | will grab your published CLI and run it!
940 | 468 | 253 | 
941 | 469 | 
942 | 470 | --------------------------------------------------------------------------------
943 | 471 | /output.md:
944 | 472 | --------------------------------------------------------------------------------
945 | 473 | 1 | /.gitignore:
946 | 474 | 2 | --------------------------------------------------------------------------------
947 | 475 | 3 | 1 | node_modules/
948 | 476 | 4 | 2 | dist/
949 | 477 | 5 | 3 | *.log
950 | 478 | 6 | 4 | .DS_Store
951 | 479 | 7 | 5 | coverage/
952 | 480 | 8 | 6 | .env 
953 | 481 | 9 | 7 | asdf.md
954 | 482 | 10 | 
955 | 483 | 11 | --------------------------------------------------------------------------------
956 | 484 | 12 | /LICENSE:
957 | 485 | 13 | --------------------------------------------------------------------------------
958 | 486 | 14 | 1 | MIT License
959 | 487 | 15 | 2 | 
960 | 488 | 16 | 3 | Copyright (c) 2024 boltfetch
961 | 489 | 17 | 4 | 
962 | 490 | 18 | 5 | Permission is hereby granted, free of charge, to any person obtaining a copy
963 | 491 | 19 | 6 | of this software and associated documentation files (the "Software"), to deal
964 | 492 | 20 | 7 | in the Software without restriction, including without limitation the rights
965 | 493 | 21 | 8 | to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
966 | 494 | 22 | 9 | copies of the Software, and to permit persons to whom the Software is
967 | 495 | 23 | 10 | furnished to do so, subject to the following conditions:
968 | 496 | 24 | 11 | 
969 | 497 | 25 | 12 | The above copyright notice and this permission notice shall be included in all
970 | 498 | 26 | 13 | copies or substantial portions of the Software.
971 | 499 | 27 | 14 | 
972 | 500 | 28 | 15 | THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
973 | 501 | 29 | 16 | IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
974 | 502 | 30 | 17 | FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
975 | 503 | 31 | 18 | AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
976 | 504 | 32 | 19 | LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
977 | 505 | 33 | 20 | OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
978 | 506 | 34 | 21 | SOFTWARE. 
979 | 507 | 35 | 
980 | 508 | 36 | --------------------------------------------------------------------------------
981 | 509 | 37 | /README.md:
982 | 510 | 38 | --------------------------------------------------------------------------------
983 | 511 | 39 | 1 | # boltfetch
984 | 512 | 40 | 2 | 
985 | 513 | 41 | 3 | Recursively fetches all code files in the current directory, ignoring what's in `.gitignore`,  
986 | 514 | 42 | 4 | then outputs them into a single Markdown file with line numbers.
987 | 515 | 43 | 5 | 
988 | 516 | 44 | 6 | ## Usage
989 | 517 | 45 | 7 | 
990 | 518 | 46 | 8 | ```bash
991 | 519 | 47 | 9 | npx boltfetch -o my-complete-source.md
992 | 520 | 48 | 10 | ```
993 | 521 | 49 | 11 | 
994 | 522 | 50 | 12 | If -o (or --output) is not provided, it will print to stdout.
995 | 523 | 51 | 13 | 
996 | 524 | 52 | 14 | ## Installation
997 | 525 | 53 | 15 | 
998 | 526 | 54 | 16 | You can run directly with npx:
999 | 527 | 55 | 17 | 
1000 | 528 | 56 | 18 | ```bash
1001 | 529 | 57 | 19 | npx boltfetch
1002 | 530 | 58 | 20 | ```
1003 | 531 | 59 | 21 | 
1004 | 532 | 60 | 22 | Or install globally:
1005 | 533 | 61 | 23 | 
1006 | 534 | 62 | 24 | ```bash
1007 | 535 | 63 | 25 | npm install -g boltfetch
1008 | 536 | 64 | 26 | boltfetch -o output.md
1009 | 537 | 65 | 27 | ```
1010 | 538 | 66 | 28 | 
1011 | 539 | 67 | 29 | ## License
1012 | 540 | 68 | 30 | 
1013 | 541 | 69 | 31 | MIT 
1014 | 542 | 70 | 
1015 | 543 | 71 | --------------------------------------------------------------------------------
1016 | 544 | 72 | /index.js:
1017 | 545 | 73 | --------------------------------------------------------------------------------
1018 | 546 | 74 | 1 | #!/usr/bin/env node
1019 | 547 | 75 | 2 | 
1020 | 548 | 76 | 3 | import fs from "node:fs";
1021 | 549 | 77 | 4 | import path from "node:path";
1022 | 550 | 78 | 5 | import process from "node:process";
1023 | 551 | 79 | 6 | import { fileURLToPath } from "node:url";
1024 | 552 | 80 | 7 | 
1025 | 553 | 81 | 8 | // We'll use `ignore` to handle ignoring files
1026 | 554 | 82 | 9 | import ignore from "ignore";
1027 | 555 | 83 | 10 | 
1028 | 556 | 84 | 11 | // Resolve current directory in ESM context
1029 | 557 | 85 | 12 | const __filename = fileURLToPath(import.meta.url);
1030 | 558 | 86 | 13 | const __dirname = path.dirname(__filename);
1031 | 559 | 87 | 14 | 
1032 | 560 | 88 | 15 | /**
1033 | 561 | 89 | 16 |  * Simple function to parse CLI args:
1034 | 562 | 90 | 17 |  *
1035 | 563 | 91 | 18 |  * -o, --output <file> : specify output filename
1036 | 564 | 92 | 19 |  */
1037 | 565 | 93 | 20 | function parseArgs(argv) {
1038 | 566 | 94 | 21 |   const result = {
1039 | 567 | 95 | 22 |     output: null,
1040 | 568 | 96 | 23 |   };
1041 | 569 | 97 | 24 |   for (let i = 2; i < argv.length; i++) {
1042 | 570 | 98 | 25 |     const arg = argv[i];
1043 | 571 | 99 | 26 |     if ((arg === "-o" || arg === "--output") && argv[i + 1]) {
1044 | 572 | 100 | 27 |       result.output = argv[i + 1];
1045 | 573 | 101 | 28 |       i++;
1046 | 574 | 102 | 29 |     }
1047 | 575 | 103 | 30 |   }
1048 | 576 | 104 | 31 |   return result;
1049 | 577 | 105 | 32 | }
1050 | 578 | 106 | 33 | 
1051 | 579 | 107 | 34 | const { output } = parseArgs(process.argv);
1052 | 580 | 108 | 35 | 
1053 | 581 | 109 | 36 | // Try reading .gitignore if it exists
1054 | 582 | 110 | 37 | const ig = ignore();
1055 | 583 | 111 | 38 | try {
1056 | 584 | 112 | 39 |   const gitignoreContent = fs.readFileSync(
1057 | 585 | 113 | 40 |     path.join(process.cwd(), ".gitignore"),
1058 | 586 | 114 | 41 |     "utf8"
1059 | 587 | 115 | 42 |   );
1060 | 588 | 116 | 43 |   ig.add(gitignoreContent);
1061 | 589 | 117 | 44 | } catch {
1062 | 590 | 118 | 45 |   // .gitignore not found or unreadable - that's fine
1063 | 591 | 119 | 46 | }
1064 | 592 | 120 | 47 | 
1065 | 593 | 121 | 48 | /**
1066 | 594 | 122 | 49 |  * Recursively collect all files in the current working directory,
1067 | 595 | 123 | 50 |  * ignoring anything matched by .gitignore (if present).
1068 | 596 | 124 | 51 |  */
1069 | 597 | 125 | 52 | function collectFiles(dir) {
1070 | 598 | 126 | 53 |   let results = [];
1071 | 599 | 127 | 54 |   const list = fs.readdirSync(dir);
1072 | 600 | 128 | 55 | 
1073 | 601 | 129 | 56 |   for (const filename of list) {
1074 | 602 | 130 | 57 |     // Full path
1075 | 603 | 131 | 58 |     const filePath = path.join(dir, filename);
1076 | 604 | 132 | 59 |     // Relative path from CWD (for ignoring logic)
1077 | 605 | 133 | 60 |     const relPath = path.relative(process.cwd(), filePath);
1078 | 606 | 134 | 61 | 
1079 | 607 | 135 | 62 |     // If ignored by .gitignore, skip
1080 | 608 | 136 | 63 |     if (ig.ignores(relPath)) {
1081 | 609 | 137 | 64 |       continue;
1082 | 610 | 138 | 65 |     }
1083 | 611 | 139 | 66 | 
1084 | 612 | 140 | 67 |     const stat = fs.statSync(filePath);
1085 | 613 | 141 | 68 | 
1086 | 614 | 142 | 69 |     if (stat.isDirectory()) {
1087 | 615 | 143 | 70 |       // Recurse into subdirectory
1088 | 616 | 144 | 71 |       results = results.concat(collectFiles(filePath));
1089 | 617 | 145 | 72 |     } else {
1090 | 618 | 146 | 73 |       // It's a file
1091 | 619 | 147 | 74 |       results.push(filePath);
1092 | 620 | 148 | 75 |     }
1093 | 621 | 149 | 76 |   }
1094 | 622 | 150 | 77 |   return results;
1095 | 623 | 151 | 78 | }
1096 | 624 | 152 | 79 | 
1097 | 625 | 153 | 80 | // Actually gather up the file list
1098 | 626 | 154 | 81 | const allFiles = collectFiles(process.cwd());
1099 | 627 | 155 | 82 | 
1100 | 628 | 156 | 83 | /**
1101 | 629 | 157 | 84 |  * Generate the final markdown content.
1102 | 630 | 158 | 85 |  * We replicate the style:
1103 | 631 | 159 | 86 |  *
1104 | 632 | 160 | 87 |  * /path/to/file:
1105 | 633 | 161 | 88 |  * --------------------------------------------------------------------------------
1106 | 634 | 162 | 89 |  * 1 | ...
1107 | 635 | 163 | 90 |  * 2 | ...
1108 | 636 | 164 | 91 |  * --------------------------------------------------------------------------------
1109 | 637 | 165 | 92 |  *
1110 | 638 | 166 | 93 |  */
1111 | 639 | 167 | 94 | function generateMarkdown(files) {
1112 | 640 | 168 | 95 |   const lines = [];
1113 | 641 | 169 | 96 | 
1114 | 642 | 170 | 97 |   for (const file of files) {
1115 | 643 | 171 | 98 |     // Turn absolute path into something relative
1116 | 644 | 172 | 99 |     const relativePath = path.relative(process.cwd(), file);
1117 | 645 | 173 | 100 |     const content = fs.readFileSync(file, "utf8");
1118 | 646 | 174 | 101 | 
1119 | 647 | 175 | 102 |     // Start of file block
1120 | 648 | 176 | 103 |     lines.push(`/${relativePath}:`);
1121 | 649 | 177 | 104 |     lines.push(
1122 | 650 | 178 | 105 |       "--------------------------------------------------------------------------------"
1123 | 651 | 179 | 106 |     );
1124 | 652 | 180 | 107 | 
1125 | 653 | 181 | 108 |     // Add line numbers
1126 | 654 | 182 | 109 |     const fileLines = content.split("\n");
1127 | 655 | 183 | 110 |     fileLines.forEach((line, i) => {
1128 | 656 | 184 | 111 |       // +1 because line numbers start at 1
1129 | 657 | 185 | 112 |       lines.push(`${i + 1} | ${line}`);
1130 | 658 | 186 | 113 |     });
1131 | 659 | 187 | 114 | 
1132 | 660 | 188 | 115 |     lines.push("");
1133 | 661 | 189 | 116 |     lines.push(
1134 | 662 | 190 | 117 |       "--------------------------------------------------------------------------------"
1135 | 663 | 191 | 118 |     );
1136 | 664 | 192 | 119 |   }
1137 | 665 | 193 | 120 | 
1138 | 666 | 194 | 121 |   return lines.join("\n");
1139 | 667 | 195 | 122 | }
1140 | 668 | 196 | 123 | 
1141 | 669 | 197 | 124 | // Build the final output
1142 | 670 | 198 | 125 | const final = generateMarkdown(allFiles);
1143 | 671 | 199 | 126 | 
1144 | 672 | 200 | 127 | // Write to file if `-o/--output` was given, else print to stdout
1145 | 673 | 201 | 128 | if (output) {
1146 | 674 | 202 | 129 |   fs.writeFileSync(output, final, "utf8");
1147 | 675 | 203 | 130 |   console.log(`All files are written to ${output}.`);
1148 | 676 | 204 | 131 | } else {
1149 | 677 | 205 | 132 |   console.log(final);
1150 | 678 | 206 | 133 | }
1151 | 679 | 207 | 134 | 
1152 | 680 | 208 | 
1153 | 681 | 209 | --------------------------------------------------------------------------------
1154 | 682 | 210 | /instruct.md:
1155 | 683 | 211 | --------------------------------------------------------------------------------
1156 | 684 | 212 | 1 | Below is a complete working example of a small CLI tool called boltfetch that:
1157 | 685 | 213 | 2 | 
1158 | 686 | 214 | 3 | Recursively reads all files in the current directory.
1159 | 687 | 215 | 4 | Respects patterns in a local .gitignore (if present).
1160 | 688 | 216 | 5 | Outputs all file contents into a single Markdown file (or to stdout) with the same “numbered lines” format you showed in your example.
1161 | 689 | 217 | 6 | You can publish this to npm (or just run it via npx) so that in a WebContainer (like StackBlitz) you can do:
1162 | 690 | 218 | 7 | 
1163 | 691 | 219 | 8 | bash
1164 | 692 | 220 | 9 | Copy code
1165 | 693 | 221 | 10 | npx boltfetch -o my-complete-source.md
1166 | 694 | 222 | 11 | …and get a my-complete-source.md that contains all your files in the requested format.
1167 | 695 | 223 | 12 | 
1168 | 696 | 224 | 13 | File structure
1169 | 697 | 225 | 14 | bash
1170 | 698 | 226 | 15 | Copy code
1171 | 699 | 227 | 16 | boltfetch/
1172 | 700 | 228 | 17 |   ├─ package.json
1173 | 701 | 229 | 18 |   ├─ index.js       # Main CLI logic
1174 | 702 | 230 | 19 |   ├─ LICENSE        # MIT License (example)
1175 | 703 | 231 | 20 |   ├─ README.md      # (optional)
1176 | 704 | 232 | 21 |   └─ .gitignore     # (optional - if you want to ignore certain files)
1177 | 705 | 233 | 22 | Below, you’ll find the complete source of each file.
1178 | 706 | 234 | 23 | Feel free to rename any references if you like. This example uses the name boltfetch.
1179 | 707 | 235 | 24 | 
1180 | 708 | 236 | 25 | /package.json
1181 | 709 | 237 | 26 | jsonc
1182 | 710 | 238 | 27 | Copy code
1183 | 711 | 239 | 28 | {
1184 | 712 | 240 | 29 |   "name": "boltfetch",
1185 | 713 | 241 | 30 |   "version": "1.0.0",
1186 | 714 | 242 | 31 |   "description": "Fetches all files in the current directory and outputs them in a Markdown file.",
1187 | 715 | 243 | 32 |   "bin": {
1188 | 716 | 244 | 33 |     "boltfetch": "./index.js"
1189 | 717 | 245 | 34 |   },
1190 | 718 | 246 | 35 |   "type": "module",
1191 | 719 | 247 | 36 |   "keywords": ["boltfetch", "cli", "markdown", "source-code"],
1192 | 720 | 248 | 37 |   "author": "Your Name <you@example.com>",
1193 | 721 | 249 | 38 |   "license": "MIT",
1194 | 722 | 250 | 39 |   "dependencies": {
1195 | 723 | 251 | 40 |     "gitignore-parser": "^0.1.6"
1196 | 724 | 252 | 41 |   }
1197 | 725 | 253 | 42 | }
1198 | 726 | 254 | 43 | /LICENSE (example)
1199 | 727 | 255 | 44 | kotlin
1200 | 728 | 256 | 45 | Copy code
1201 | 729 | 257 | 46 | MIT License
1202 | 730 | 258 | 47 | 
1203 | 731 | 259 | 48 | Copyright (c) 2025 ...
1204 | 732 | 260 | 49 | 
1205 | 733 | 261 | 50 | Permission is hereby granted, free of charge, to any person obtaining a copy of this software ...
1206 | 734 | 262 | 51 | (Include your own license text as you wish.)
1207 | 735 | 263 | 52 | 
1208 | 736 | 264 | 53 | /README.md (optional)
1209 | 737 | 265 | 54 | md
1210 | 738 | 266 | 55 | Copy code
1211 | 739 | 267 | 56 | # boltfetch
1212 | 740 | 268 | 57 | 
1213 | 741 | 269 | 58 | Recursively fetches all code files in the current directory, ignoring what’s in `.gitignore`,  
1214 | 742 | 270 | 59 | then outputs them into a single Markdown file with line numbers.
1215 | 743 | 271 | 60 | 
1216 | 744 | 272 | 61 | ## Usage
1217 | 745 | 273 | 62 | 
1218 | 746 | 274 | 63 | ```bash
1219 | 747 | 275 | 64 | npx boltfetch -o my-complete-source.md
1220 | 748 | 276 | 65 | If -o (or --output) is not provided, it will print to stdout.
1221 | 749 | 277 | 66 | 
1222 | 750 | 278 | 67 | yaml
1223 | 751 | 279 | 68 | Copy code
1224 | 752 | 280 | 69 | 
1225 | 753 | 281 | 70 | ---
1226 | 754 | 282 | 71 | 
1227 | 755 | 283 | 72 | ### `/.gitignore` (optional)
1228 | 756 | 284 | 73 | 
1229 | 757 | 285 | 74 | node_modules dist *.log .DS_Store
1230 | 758 | 286 | 75 | 
1231 | 759 | 287 | 76 | php
1232 | 760 | 288 | 77 | Copy code
1233 | 761 | 289 | 78 | 
1234 | 762 | 290 | 79 | *(Adjust your ignore patterns as needed.)*
1235 | 763 | 291 | 80 | 
1236 | 764 | 292 | 81 | ---
1237 | 765 | 293 | 82 | 
1238 | 766 | 294 | 83 | ### `/index.js`
1239 | 767 | 295 | 84 | 
1240 | 768 | 296 | 85 | > **Important**: This file is the core logic of the CLI.  
1241 | 769 | 297 | 86 | > It’s written in plain JS so it can run under Node immediately.
1242 | 770 | 298 | 87 | 
1243 | 771 | 299 | 88 | ```js
1244 | 772 | 300 | 89 | #!/usr/bin/env node
1245 | 773 | 301 | 90 | 
1246 | 774 | 302 | 91 | import fs from "node:fs"
1247 | 775 | 303 | 92 | import path from "node:path"
1248 | 776 | 304 | 93 | import process from "node:process"
1249 | 777 | 305 | 94 | import { fileURLToPath } from "node:url"
1250 | 778 | 306 | 95 | 
1251 | 779 | 307 | 96 | // We’ll use `gitignore-parser` to handle ignoring files
1252 | 780 | 308 | 97 | import gitignoreParser from "gitignore-parser"
1253 | 781 | 309 | 98 | 
1254 | 782 | 310 | 99 | // Resolve current directory in ESM context
1255 | 783 | 311 | 100 | const __filename = fileURLToPath(import.meta.url)
1256 | 784 | 312 | 101 | const __dirname = path.dirname(__filename)
1257 | 785 | 313 | 102 | 
1258 | 786 | 314 | 103 | /**
1259 | 787 | 315 | 104 |  * Simple function to parse CLI args:
1260 | 788 | 316 | 105 |  * 
1261 | 789 | 317 | 106 |  * -o, --output <file> : specify output filename 
1262 | 790 | 318 | 107 |  */
1263 | 791 | 319 | 108 | function parseArgs(argv) {
1264 | 792 | 320 | 109 |   const result = {
1265 | 793 | 321 | 110 |     output: null
1266 | 794 | 322 | 111 |   }
1267 | 795 | 323 | 112 |   for (let i = 2; i < argv.length; i++) {
1268 | 796 | 324 | 113 |     const arg = argv[i]
1269 | 797 | 325 | 114 |     if ((arg === "-o" || arg === "--output") && argv[i + 1]) {
1270 | 798 | 326 | 115 |       result.output = argv[i + 1]
1271 | 799 | 327 | 116 |       i++
1272 | 800 | 328 | 117 |     }
1273 | 801 | 329 | 118 |   }
1274 | 802 | 330 | 119 |   return result
1275 | 803 | 331 | 120 | }
1276 | 804 | 332 | 121 | 
1277 | 805 | 333 | 122 | const { output } = parseArgs(process.argv)
1278 | 806 | 334 | 123 | 
1279 | 807 | 335 | 124 | // Try reading .gitignore if it exists
1280 | 808 | 336 | 125 | let isIgnored
1281 | 809 | 337 | 126 | try {
1282 | 810 | 338 | 127 |   const gitignoreContent = fs.readFileSync(
1283 | 811 | 339 | 128 |     path.join(process.cwd(), ".gitignore"),
1284 | 812 | 340 | 129 |     "utf8"
1285 | 813 | 341 | 130 |   )
1286 | 814 | 342 | 131 |   isIgnored = gitignoreParser.compile(gitignoreContent)
1287 | 815 | 343 | 132 | } catch {
1288 | 816 | 344 | 133 |   // .gitignore not found or unreadable
1289 | 817 | 345 | 134 |   // fallback to a function that never ignores
1290 | 818 | 346 | 135 |   isIgnored = () => false
1291 | 819 | 347 | 136 | }
1292 | 820 | 348 | 137 | 
1293 | 821 | 349 | 138 | /**
1294 | 822 | 350 | 139 |  * Recursively collect all files in the current working directory,
1295 | 823 | 351 | 140 |  * ignoring anything matched by .gitignore (if present).
1296 | 824 | 352 | 141 |  */
1297 | 825 | 353 | 142 | function collectFiles(dir) {
1298 | 826 | 354 | 143 |   let results = []
1299 | 827 | 355 | 144 |   const list = fs.readdirSync(dir)
1300 | 828 | 356 | 145 | 
1301 | 829 | 357 | 146 |   for (const filename of list) {
1302 | 830 | 358 | 147 |     // Full path
1303 | 831 | 359 | 148 |     const filePath = path.join(dir, filename)
1304 | 832 | 360 | 149 |     // Relative path from CWD (for ignoring logic)
1305 | 833 | 361 | 150 |     const relPath = path.relative(process.cwd(), filePath)
1306 | 834 | 362 | 151 | 
1307 | 835 | 363 | 152 |     // If ignored by .gitignore, skip
1308 | 836 | 364 | 153 |     if (isIgnored(relPath)) {
1309 | 837 | 365 | 154 |       continue
1310 | 838 | 366 | 155 |     }
1311 | 839 | 367 | 156 | 
1312 | 840 | 368 | 157 |     const stat = fs.statSync(filePath)
1313 | 841 | 369 | 158 | 
1314 | 842 | 370 | 159 |     if (stat.isDirectory()) {
1315 | 843 | 371 | 160 |       // Recurse into subdirectory
1316 | 844 | 372 | 161 |       results = results.concat(collectFiles(filePath))
1317 | 845 | 373 | 162 |     } else {
1318 | 846 | 374 | 163 |       // It's a file
1319 | 847 | 375 | 164 |       results.push(filePath)
1320 | 848 | 376 | 165 |     }
1321 | 849 | 377 | 166 |   }
1322 | 850 | 378 | 167 |   return results
1323 | 851 | 379 | 168 | }
1324 | 852 | 380 | 169 | 
1325 | 853 | 381 | 170 | // Actually gather up the file list
1326 | 854 | 382 | 171 | const allFiles = collectFiles(process.cwd())
1327 | 855 | 383 | 172 | 
1328 | 856 | 384 | 173 | /**
1329 | 857 | 385 | 174 |  * Generate the final markdown content.
1330 | 858 | 386 | 175 |  * We replicate the style:
1331 | 859 | 387 | 176 |  *
1332 | 860 | 388 | 177 |  * /path/to/file:
1333 | 861 | 389 | 178 |  * --------------------------------------------------------------------------------
1334 | 862 | 390 | 179 |  * 1 | ...
1335 | 863 | 391 | 180 |  * 2 | ...
1336 | 864 | 392 | 181 |  * --------------------------------------------------------------------------------
1337 | 865 | 393 | 182 |  *
1338 | 866 | 394 | 183 |  */
1339 | 867 | 395 | 184 | function generateMarkdown(files) {
1340 | 868 | 396 | 185 |   const lines = []
1341 | 869 | 397 | 186 | 
1342 | 870 | 398 | 187 |   for (const file of files) {
1343 | 871 | 399 | 188 |     // Turn absolute path into something relative
1344 | 872 | 400 | 189 |     const relativePath = path.relative(process.cwd(), file)
1345 | 873 | 401 | 190 |     const content = fs.readFileSync(file, "utf8")
1346 | 874 | 402 | 191 | 
1347 | 875 | 403 | 192 |     // Start of file block
1348 | 876 | 404 | 193 |     lines.push(`/${relativePath}:`)
1349 | 877 | 405 | 194 |     lines.push("--------------------------------------------------------------------------------")
1350 | 878 | 406 | 195 | 
1351 | 879 | 407 | 196 |     // Add line numbers
1352 | 880 | 408 | 197 |     const fileLines = content.split("\n")
1353 | 881 | 409 | 198 |     fileLines.forEach((line, i) => {
1354 | 882 | 410 | 199 |       // +1 because line numbers start at 1
1355 | 883 | 411 | 200 |       lines.push(`${i + 1} | ${line}`)
1356 | 884 | 412 | 201 |     })
1357 | 885 | 413 | 202 | 
1358 | 886 | 414 | 203 |     lines.push("")
1359 | 887 | 415 | 204 |     lines.push("--------------------------------------------------------------------------------")
1360 | 888 | 416 | 205 |   }
1361 | 889 | 417 | 206 | 
1362 | 890 | 418 | 207 |   return lines.join("\n")
1363 | 891 | 419 | 208 | }
1364 | 892 | 420 | 209 | 
1365 | 893 | 421 | 210 | // Build the final output
1366 | 894 | 422 | 211 | const final = generateMarkdown(allFiles)
1367 | 895 | 423 | 212 | 
1368 | 896 | 424 | 213 | // Write to file if `-o/--output` was given, else print to stdout
1369 | 897 | 425 | 214 | if (output) {
1370 | 898 | 426 | 215 |   fs.writeFileSync(output, final, "utf8")
1371 | 899 | 427 | 216 |   console.log(`All files are written to ${output}.`)
1372 | 900 | 428 | 217 | } else {
1373 | 901 | 429 | 218 |   console.log(final)
1374 | 902 | 430 | 219 | }
1375 | 903 | 431 | 220 | How to Use Locally or in a WebContainer
1376 | 904 | 432 | 221 | Install dependencies
1377 | 905 | 433 | 222 | bash
1378 | 906 | 434 | 223 | Copy code
1379 | 907 | 435 | 224 | npm install
1380 | 908 | 436 | 225 | Link (optional, for local testing)
1381 | 909 | 437 | 226 | bash
1382 | 910 | 438 | 227 | Copy code
1383 | 911 | 439 | 228 | npm link
1384 | 912 | 440 | 229 | # Now you can run `boltfetch` in this directory
1385 | 913 | 441 | 230 | Or just run directly
1386 | 914 | 442 | 231 | bash
1387 | 915 | 443 | 232 | Copy code
1388 | 916 | 444 | 233 | node index.js -o my-complete-source.md
1389 | 917 | 445 | 234 | From a WebContainer (like StackBlitz):
1390 | 918 | 446 | 235 | bash
1391 | 919 | 447 | 236 | Copy code
1392 | 920 | 448 | 237 | npx boltfetch -o my-complete-source.md
1393 | 921 | 449 | 238 | This will create my-complete-source.md containing the entire project (except files ignored by .gitignore).
1394 | 922 | 450 | 239 | Publish to npm
1395 | 923 | 451 | 240 | If you want to publish this so that anyone can run npx boltfetch:
1396 | 924 | 452 | 241 | 
1397 | 925 | 453 | 242 | Make sure you have an npm account (and have run npm login).
1398 | 926 | 454 | 243 | Bump the version in package.json as needed.
1399 | 927 | 455 | 244 | Run:
1400 | 928 | 456 | 245 | bash
1401 | 929 | 457 | 246 | Copy code
1402 | 930 | 458 | 247 | npm publish
1403 | 931 | 459 | 248 | Now, from any environment:
1404 | 932 | 460 | 249 | bash
1405 | 933 | 461 | 250 | Copy code
1406 | 934 | 462 | 251 | npx boltfetch -o my-complete-source.md
1407 | 935 | 463 | 252 | will grab your published CLI and run it!
1408 | 936 | 464 | 253 | 
1409 | 937 | 465 | 
1410 | 938 | 466 | --------------------------------------------------------------------------------
1411 | 939 | 467 | /output.md:
1412 | 940 | 468 | --------------------------------------------------------------------------------
1413 | 941 | 469 | 1 | /.gitignore:
1414 | 942 | 470 | 2 | --------------------------------------------------------------------------------
1415 | 943 | 471 | 3 | 1 | node_modules/
1416 | 944 | 472 | 4 | 2 | dist/
1417 | 945 | 473 | 5 | 3 | *.log
1418 | 946 | 474 | 6 | 4 | .DS_Store
1419 | 947 | 475 | 7 | 5 | coverage/
1420 | 948 | 476 | 8 | 6 | .env 
1421 | 949 | 477 | 9 | 
1422 | 950 | 478 | 10 | --------------------------------------------------------------------------------
1423 | 951 | 479 | 11 | /LICENSE:
1424 | 952 | 480 | 12 | --------------------------------------------------------------------------------
1425 | 953 | 481 | 13 | 1 | MIT License
1426 | 954 | 482 | 14 | 2 | 
1427 | 955 | 483 | 15 | 3 | Copyright (c) 2024 boltfetch
1428 | 956 | 484 | 16 | 4 | 
1429 | 957 | 485 | 17 | 5 | Permission is hereby granted, free of charge, to any person obtaining a copy
1430 | 958 | 486 | 18 | 6 | of this software and associated documentation files (the "Software"), to deal
1431 | 959 | 487 | 19 | 7 | in the Software without restriction, including without limitation the rights
1432 | 960 | 488 | 20 | 8 | to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
1433 | 961 | 489 | 21 | 9 | copies of the Software, and to permit persons to whom the Software is
1434 | 962 | 490 | 22 | 10 | furnished to do so, subject to the following conditions:
1435 | 963 | 491 | 23 | 11 | 
1436 | 964 | 492 | 24 | 12 | The above copyright notice and this permission notice shall be included in all
1437 | 965 | 493 | 25 | 13 | copies or substantial portions of the Software.
1438 | 966 | 494 | 26 | 14 | 
1439 | 967 | 495 | 27 | 15 | THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
1440 | 968 | 496 | 28 | 16 | IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
1441 | 969 | 497 | 29 | 17 | FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
1442 | 970 | 498 | 30 | 18 | AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
1443 | 971 | 499 | 31 | 19 | LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
1444 | 972 | 500 | 32 | 20 | OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
1445 | 973 | 501 | 33 | 21 | SOFTWARE. 
1446 | 974 | 502 | 34 | 
1447 | 975 | 503 | 35 | --------------------------------------------------------------------------------
1448 | 976 | 504 | 36 | /README.md:
1449 | 977 | 505 | 37 | --------------------------------------------------------------------------------
1450 | 978 | 506 | 38 | 1 | # boltfetch
1451 | 979 | 507 | 39 | 2 | 
1452 | 980 | 508 | 40 | 3 | Recursively fetches all code files in the current directory, ignoring what's in `.gitignore`,  
1453 | 981 | 509 | 41 | 4 | then outputs them into a single Markdown file with line numbers.
1454 | 982 | 510 | 42 | 5 | 
1455 | 983 | 511 | 43 | 6 | ## Usage
1456 | 984 | 512 | 44 | 7 | 
1457 | 985 | 513 | 45 | 8 | ```bash
1458 | 986 | 514 | 46 | 9 | npx boltfetch -o my-complete-source.md
1459 | 987 | 515 | 47 | 10 | ```
1460 | 988 | 516 | 48 | 11 | 
1461 | 989 | 517 | 49 | 12 | If -o (or --output) is not provided, it will print to stdout.
1462 | 990 | 518 | 50 | 13 | 
1463 | 991 | 519 | 51 | 14 | ## Installation
1464 | 992 | 520 | 52 | 15 | 
1465 | 993 | 521 | 53 | 16 | You can run directly with npx:
1466 | 994 | 522 | 54 | 17 | 
1467 | 995 | 523 | 55 | 18 | ```bash
1468 | 996 | 524 | 56 | 19 | npx boltfetch
1469 | 997 | 525 | 57 | 20 | ```
1470 | 998 | 526 | 58 | 21 | 
1471 | 999 | 527 | 59 | 22 | Or install globally:
1472 | 1000 | 528 | 60 | 23 | 
1473 | 1001 | 529 | 61 | 24 | ```bash
1474 | 1002 | 530 | 62 | 25 | npm install -g boltfetch
1475 | 1003 | 531 | 63 | 26 | boltfetch -o output.md
1476 | 1004 | 532 | 64 | 27 | ```
1477 | 1005 | 533 | 65 | 28 | 
1478 | 1006 | 534 | 66 | 29 | ## License
1479 | 1007 | 535 | 67 | 30 | 
1480 | 1008 | 536 | 68 | 31 | MIT 
1481 | 1009 | 537 | 69 | 
1482 | 1010 | 538 | 70 | --------------------------------------------------------------------------------
1483 | 1011 | 539 | 71 | /index.js:
1484 | 1012 | 540 | 72 | --------------------------------------------------------------------------------
1485 | 1013 | 541 | 73 | 1 | #!/usr/bin/env node
1486 | 1014 | 542 | 74 | 2 | 
1487 | 1015 | 543 | 75 | 3 | import fs from "node:fs";
1488 | 1016 | 544 | 76 | 4 | import path from "node:path";
1489 | 1017 | 545 | 77 | 5 | import process from "node:process";
1490 | 1018 | 546 | 78 | 6 | import { fileURLToPath } from "node:url";
1491 | 1019 | 547 | 79 | 7 | 
1492 | 1020 | 548 | 80 | 8 | // We'll use `ignore` to handle ignoring files
1493 | 1021 | 549 | 81 | 9 | import ignore from "ignore";
1494 | 1022 | 550 | 82 | 10 | 
1495 | 1023 | 551 | 83 | 11 | // Resolve current directory in ESM context
1496 | 1024 | 552 | 84 | 12 | const __filename = fileURLToPath(import.meta.url);
1497 | 1025 | 553 | 85 | 13 | const __dirname = path.dirname(__filename);
1498 | 1026 | 554 | 86 | 14 | 
1499 | 1027 | 555 | 87 | 15 | /**
1500 | 1028 | 556 | 88 | 16 |  * Simple function to parse CLI args:
1501 | 1029 | 557 | 89 | 17 |  *
1502 | 1030 | 558 | 90 | 18 |  * -o, --output <file> : specify output filename
1503 | 1031 | 559 | 91 | 19 |  */
1504 | 1032 | 560 | 92 | 20 | function parseArgs(argv) {
1505 | 1033 | 561 | 93 | 21 |   const result = {
1506 | 1034 | 562 | 94 | 22 |     output: null,
1507 | 1035 | 563 | 95 | 23 |   };
1508 | 1036 | 564 | 96 | 24 |   for (let i = 2; i < argv.length; i++) {
1509 | 1037 | 565 | 97 | 25 |     const arg = argv[i];
1510 | 1038 | 566 | 98 | 26 |     if ((arg === "-o" || arg === "--output") && argv[i + 1]) {
1511 | 1039 | 567 | 99 | 27 |       result.output = argv[i + 1];
1512 | 1040 | 568 | 100 | 28 |       i++;
1513 | 1041 | 569 | 101 | 29 |     }
1514 | 1042 | 570 | 102 | 30 |   }
1515 | 1043 | 571 | 103 | 31 |   return result;
1516 | 1044 | 572 | 104 | 32 | }
1517 | 1045 | 573 | 105 | 33 | 
1518 | 1046 | 574 | 106 | 34 | const { output } = parseArgs(process.argv);
1519 | 1047 | 575 | 107 | 35 | 
1520 | 1048 | 576 | 108 | 36 | // Try reading .gitignore if it exists
1521 | 1049 | 577 | 109 | 37 | const ig = ignore();
1522 | 1050 | 578 | 110 | 38 | try {
1523 | 1051 | 579 | 111 | 39 |   const gitignoreContent = fs.readFileSync(
1524 | 1052 | 580 | 112 | 40 |     path.join(process.cwd(), ".gitignore"),
1525 | 1053 | 581 | 113 | 41 |     "utf8"
1526 | 1054 | 582 | 114 | 42 |   );
1527 | 1055 | 583 | 115 | 43 |   ig.add(gitignoreContent);
1528 | 1056 | 584 | 116 | 44 | } catch {
1529 | 1057 | 585 | 117 | 45 |   // .gitignore not found or unreadable - that's fine
1530 | 1058 | 586 | 118 | 46 | }
1531 | 1059 | 587 | 119 | 47 | 
1532 | 1060 | 588 | 120 | 48 | /**
1533 | 1061 | 589 | 121 | 49 |  * Recursively collect all files in the current working directory,
1534 | 1062 | 590 | 122 | 50 |  * ignoring anything matched by .gitignore (if present).
1535 | 1063 | 591 | 123 | 51 |  */
1536 | 1064 | 592 | 124 | 52 | function collectFiles(dir) {
1537 | 1065 | 593 | 125 | 53 |   let results = [];
1538 | 1066 | 594 | 126 | 54 |   const list = fs.readdirSync(dir);
1539 | 1067 | 595 | 127 | 55 | 
1540 | 1068 | 596 | 128 | 56 |   for (const filename of list) {
1541 | 1069 | 597 | 129 | 57 |     // Full path
1542 | 1070 | 598 | 130 | 58 |     const filePath = path.join(dir, filename);
1543 | 1071 | 599 | 131 | 59 |     // Relative path from CWD (for ignoring logic)
1544 | 1072 | 600 | 132 | 60 |     const relPath = path.relative(process.cwd(), filePath);
1545 | 1073 | 601 | 133 | 61 | 
1546 | 1074 | 602 | 134 | 62 |     // If ignored by .gitignore, skip
1547 | 1075 | 603 | 135 | 63 |     if (ig.ignores(relPath)) {
1548 | 1076 | 604 | 136 | 64 |       continue;
1549 | 1077 | 605 | 137 | 65 |     }
1550 | 1078 | 606 | 138 | 66 | 
1551 | 1079 | 607 | 139 | 67 |     const stat = fs.statSync(filePath);
1552 | 1080 | 608 | 140 | 68 | 
1553 | 1081 | 609 | 141 | 69 |     if (stat.isDirectory()) {
1554 | 1082 | 610 | 142 | 70 |       // Recurse into subdirectory
1555 | 1083 | 611 | 143 | 71 |       results = results.concat(collectFiles(filePath));
1556 | 1084 | 612 | 144 | 72 |     } else {
1557 | 1085 | 613 | 145 | 73 |       // It's a file
1558 | 1086 | 614 | 146 | 74 |       results.push(filePath);
1559 | 1087 | 615 | 147 | 75 |     }
1560 | 1088 | 616 | 148 | 76 |   }
1561 | 1089 | 617 | 149 | 77 |   return results;
1562 | 1090 | 618 | 150 | 78 | }
1563 | 1091 | 619 | 151 | 79 | 
1564 | 1092 | 620 | 152 | 80 | // Actually gather up the file list
1565 | 1093 | 621 | 153 | 81 | const allFiles = collectFiles(process.cwd());
1566 | 1094 | 622 | 154 | 82 | 
1567 | 1095 | 623 | 155 | 83 | /**
1568 | 1096 | 624 | 156 | 84 |  * Generate the final markdown content.
1569 | 1097 | 625 | 157 | 85 |  * We replicate the style:
1570 | 1098 | 626 | 158 | 86 |  *
1571 | 1099 | 627 | 159 | 87 |  * /path/to/file:
1572 | 1100 | 628 | 160 | 88 |  * --------------------------------------------------------------------------------
1573 | 1101 | 629 | 161 | 89 |  * 1 | ...
1574 | 1102 | 630 | 162 | 90 |  * 2 | ...
1575 | 1103 | 631 | 163 | 91 |  * --------------------------------------------------------------------------------
1576 | 1104 | 632 | 164 | 92 |  *
1577 | 1105 | 633 | 165 | 93 |  */
1578 | 1106 | 634 | 166 | 94 | function generateMarkdown(files) {
1579 | 1107 | 635 | 167 | 95 |   const lines = [];
1580 | 1108 | 636 | 168 | 96 | 
1581 | 1109 | 637 | 169 | 97 |   for (const file of files) {
1582 | 1110 | 638 | 170 | 98 |     // Turn absolute path into something relative
1583 | 1111 | 639 | 171 | 99 |     const relativePath = path.relative(process.cwd(), file);
1584 | 1112 | 640 | 172 | 100 |     const content = fs.readFileSync(file, "utf8");
1585 | 1113 | 641 | 173 | 101 | 
1586 | 1114 | 642 | 174 | 102 |     // Start of file block
1587 | 1115 | 643 | 175 | 103 |     lines.push(`/${relativePath}:`);
1588 | 1116 | 644 | 176 | 104 |     lines.push(
1589 | 1117 | 645 | 177 | 105 |       "--------------------------------------------------------------------------------"
1590 | 1118 | 646 | 178 | 106 |     );
1591 | 1119 | 647 | 179 | 107 | 
1592 | 1120 | 648 | 180 | 108 |     // Add line numbers
1593 | 1121 | 649 | 181 | 109 |     const fileLines = content.split("\n");
1594 | 1122 | 650 | 182 | 110 |     fileLines.forEach((line, i) => {
1595 | 1123 | 651 | 183 | 111 |       // +1 because line numbers start at 1
1596 | 1124 | 652 | 184 | 112 |       lines.push(`${i + 1} | ${line}`);
1597 | 1125 | 653 | 185 | 113 |     });
1598 | 1126 | 654 | 186 | 114 | 
1599 | 1127 | 655 | 187 | 115 |     lines.push("");
1600 | 1128 | 656 | 188 | 116 |     lines.push(
1601 | 1129 | 657 | 189 | 117 |       "--------------------------------------------------------------------------------"
1602 | 1130 | 658 | 190 | 118 |     );
1603 | 1131 | 659 | 191 | 119 |   }
1604 | 1132 | 660 | 192 | 120 | 
1605 | 1133 | 661 | 193 | 121 |   return lines.join("\n");
1606 | 1134 | 662 | 194 | 122 | }
1607 | 1135 | 663 | 195 | 123 | 
1608 | 1136 | 664 | 196 | 124 | // Build the final output
1609 | 1137 | 665 | 197 | 125 | const final = generateMarkdown(allFiles);
1610 | 1138 | 666 | 198 | 126 | 
1611 | 1139 | 667 | 199 | 127 | // Write to file if `-o/--output` was given, else print to stdout
1612 | 1140 | 668 | 200 | 128 | if (output) {
1613 | 1141 | 669 | 201 | 129 |   fs.writeFileSync(output, final, "utf8");
1614 | 1142 | 670 | 202 | 130 |   console.log(`All files are written to ${output}.`);
1615 | 1143 | 671 | 203 | 131 | } else {
1616 | 1144 | 672 | 204 | 132 |   console.log(final);
1617 | 1145 | 673 | 205 | 133 | }
1618 | 1146 | 674 | 206 | 134 | 
1619 | 1147 | 675 | 207 | 
1620 | 1148 | 676 | 208 | --------------------------------------------------------------------------------
1621 | 1149 | 677 | 209 | /instruct.md:
1622 | 1150 | 678 | 210 | --------------------------------------------------------------------------------
1623 | 1151 | 679 | 211 | 1 | Below is a complete working example of a small CLI tool called boltfetch that:
1624 | 1152 | 680 | 212 | 2 | 
1625 | 1153 | 681 | 213 | 3 | Recursively reads all files in the current directory.
1626 | 1154 | 682 | 214 | 4 | Respects patterns in a local .gitignore (if present).
1627 | 1155 | 683 | 215 | 5 | Outputs all file contents into a single Markdown file (or to stdout) with the same “numbered lines” format you showed in your example.
1628 | 1156 | 684 | 216 | 6 | You can publish this to npm (or just run it via npx) so that in a WebContainer (like StackBlitz) you can do:
1629 | 1157 | 685 | 217 | 7 | 
1630 | 1158 | 686 | 218 | 8 | bash
1631 | 1159 | 687 | 219 | 9 | Copy code
1632 | 1160 | 688 | 220 | 10 | npx boltfetch -o my-complete-source.md
1633 | 1161 | 689 | 221 | 11 | …and get a my-complete-source.md that contains all your files in the requested format.
1634 | 1162 | 690 | 222 | 12 | 
1635 | 1163 | 691 | 223 | 13 | File structure
1636 | 1164 | 692 | 224 | 14 | bash
1637 | 1165 | 693 | 225 | 15 | Copy code
1638 | 1166 | 694 | 226 | 16 | boltfetch/
1639 | 1167 | 695 | 227 | 17 |   ├─ package.json
1640 | 1168 | 696 | 228 | 18 |   ├─ index.js       # Main CLI logic
1641 | 1169 | 697 | 229 | 19 |   ├─ LICENSE        # MIT License (example)
1642 | 1170 | 698 | 230 | 20 |   ├─ README.md      # (optional)
1643 | 1171 | 699 | 231 | 21 |   └─ .gitignore     # (optional - if you want to ignore certain files)
1644 | 1172 | 700 | 232 | 22 | Below, you’ll find the complete source of each file.
1645 | 1173 | 701 | 233 | 23 | Feel free to rename any references if you like. This example uses the name boltfetch.
1646 | 1174 | 702 | 234 | 24 | 
1647 | 1175 | 703 | 235 | 25 | /package.json
1648 | 1176 | 704 | 236 | 26 | jsonc
1649 | 1177 | 705 | 237 | 27 | Copy code
1650 | 1178 | 706 | 238 | 28 | {
1651 | 1179 | 707 | 239 | 29 |   "name": "boltfetch",
1652 | 1180 | 708 | 240 | 30 |   "version": "1.0.0",
1653 | 1181 | 709 | 241 | 31 |   "description": "Fetches all files in the current directory and outputs them in a Markdown file.",
1654 | 1182 | 710 | 242 | 32 |   "bin": {
1655 | 1183 | 711 | 243 | 33 |     "boltfetch": "./index.js"
1656 | 1184 | 712 | 244 | 34 |   },
1657 | 1185 | 713 | 245 | 35 |   "type": "module",
1658 | 1186 | 714 | 246 | 36 |   "keywords": ["boltfetch", "cli", "markdown", "source-code"],
1659 | 1187 | 715 | 247 | 37 |   "author": "Your Name <you@example.com>",
1660 | 1188 | 716 | 248 | 38 |   "license": "MIT",
1661 | 1189 | 717 | 249 | 39 |   "dependencies": {
1662 | 1190 | 718 | 250 | 40 |     "gitignore-parser": "^0.1.6"
1663 | 1191 | 719 | 251 | 41 |   }
1664 | 1192 | 720 | 252 | 42 | }
1665 | 1193 | 721 | 253 | 43 | /LICENSE (example)
1666 | 1194 | 722 | 254 | 44 | kotlin
1667 | 1195 | 723 | 255 | 45 | Copy code
1668 | 1196 | 724 | 256 | 46 | MIT License
1669 | 1197 | 725 | 257 | 47 | 
1670 | 1198 | 726 | 258 | 48 | Copyright (c) 2025 ...
1671 | 1199 | 727 | 259 | 49 | 
1672 | 1200 | 728 | 260 | 50 | Permission is hereby granted, free of charge, to any person obtaining a copy of this software ...
1673 | 1201 | 729 | 261 | 51 | (Include your own license text as you wish.)
1674 | 1202 | 730 | 262 | 52 | 
1675 | 1203 | 731 | 263 | 53 | /README.md (optional)
1676 | 1204 | 732 | 264 | 54 | md
1677 | 1205 | 733 | 265 | 55 | Copy code
1678 | 1206 | 734 | 266 | 56 | # boltfetch
1679 | 1207 | 735 | 267 | 57 | 
1680 | 1208 | 736 | 268 | 58 | Recursively fetches all code files in the current directory, ignoring what’s in `.gitignore`,  
1681 | 1209 | 737 | 269 | 59 | then outputs them into a single Markdown file with line numbers.
1682 | 1210 | 738 | 270 | 60 | 
1683 | 1211 | 739 | 271 | 61 | ## Usage
1684 | 1212 | 740 | 272 | 62 | 
1685 | 1213 | 741 | 273 | 63 | ```bash
1686 | 1214 | 742 | 274 | 64 | npx boltfetch -o my-complete-source.md
1687 | 1215 | 743 | 275 | 65 | If -o (or --output) is not provided, it will print to stdout.
1688 | 1216 | 744 | 276 | 66 | 
1689 | 1217 | 745 | 277 | 67 | yaml
1690 | 1218 | 746 | 278 | 68 | Copy code
1691 | 1219 | 747 | 279 | 69 | 
1692 | 1220 | 748 | 280 | 70 | ---
1693 | 1221 | 749 | 281 | 71 | 
1694 | 1222 | 750 | 282 | 72 | ### `/.gitignore` (optional)
1695 | 1223 | 751 | 283 | 73 | 
1696 | 1224 | 752 | 284 | 74 | node_modules dist *.log .DS_Store
1697 | 1225 | 753 | 285 | 75 | 
1698 | 1226 | 754 | 286 | 76 | php
1699 | 1227 | 755 | 287 | 77 | Copy code
1700 | 1228 | 756 | 288 | 78 | 
1701 | 1229 | 757 | 289 | 79 | *(Adjust your ignore patterns as needed.)*
1702 | 1230 | 758 | 290 | 80 | 
1703 | 1231 | 759 | 291 | 81 | ---
1704 | 1232 | 760 | 292 | 82 | 
1705 | 1233 | 761 | 293 | 83 | ### `/index.js`
1706 | 1234 | 762 | 294 | 84 | 
1707 | 1235 | 763 | 295 | 85 | > **Important**: This file is the core logic of the CLI.  
1708 | 1236 | 764 | 296 | 86 | > It’s written in plain JS so it can run under Node immediately.
1709 | 1237 | 765 | 297 | 87 | 
1710 | 1238 | 766 | 298 | 88 | ```js
1711 | 1239 | 767 | 299 | 89 | #!/usr/bin/env node
1712 | 1240 | 768 | 300 | 90 | 
1713 | 1241 | 769 | 301 | 91 | import fs from "node:fs"
1714 | 1242 | 770 | 302 | 92 | import path from "node:path"
1715 | 1243 | 771 | 303 | 93 | import process from "node:process"
1716 | 1244 | 772 | 304 | 94 | import { fileURLToPath } from "node:url"
1717 | 1245 | 773 | 305 | 95 | 
1718 | 1246 | 774 | 306 | 96 | // We’ll use `gitignore-parser` to handle ignoring files
1719 | 1247 | 775 | 307 | 97 | import gitignoreParser from "gitignore-parser"
1720 | 1248 | 776 | 308 | 98 | 
1721 | 1249 | 777 | 309 | 99 | // Resolve current directory in ESM context
1722 | 1250 | 778 | 310 | 100 | const __filename = fileURLToPath(import.meta.url)
1723 | 1251 | 779 | 311 | 101 | const __dirname = path.dirname(__filename)
1724 | 1252 | 780 | 312 | 102 | 
1725 | 1253 | 781 | 313 | 103 | /**
1726 | 1254 | 782 | 314 | 104 |  * Simple function to parse CLI args:
1727 | 1255 | 783 | 315 | 105 |  * 
1728 | 1256 | 784 | 316 | 106 |  * -o, --output <file> : specify output filename 
1729 | 1257 | 785 | 317 | 107 |  */
1730 | 1258 | 786 | 318 | 108 | function parseArgs(argv) {
1731 | 1259 | 787 | 319 | 109 |   const result = {
1732 | 1260 | 788 | 320 | 110 |     output: null
1733 | 1261 | 789 | 321 | 111 |   }
1734 | 1262 | 790 | 322 | 112 |   for (let i = 2; i < argv.length; i++) {
1735 | 1263 | 791 | 323 | 113 |     const arg = argv[i]
1736 | 1264 | 792 | 324 | 114 |     if ((arg === "-o" || arg === "--output") && argv[i + 1]) {
1737 | 1265 | 793 | 325 | 115 |       result.output = argv[i + 1]
1738 | 1266 | 794 | 326 | 116 |       i++
1739 | 1267 | 795 | 327 | 117 |     }
1740 | 1268 | 796 | 328 | 118 |   }
1741 | 1269 | 797 | 329 | 119 |   return result
1742 | 1270 | 798 | 330 | 120 | }
1743 | 1271 | 799 | 331 | 121 | 
1744 | 1272 | 800 | 332 | 122 | const { output } = parseArgs(process.argv)
1745 | 1273 | 801 | 333 | 123 | 
1746 | 1274 | 802 | 334 | 124 | // Try reading .gitignore if it exists
1747 | 1275 | 803 | 335 | 125 | let isIgnored
1748 | 1276 | 804 | 336 | 126 | try {
1749 | 1277 | 805 | 337 | 127 |   const gitignoreContent = fs.readFileSync(
1750 | 1278 | 806 | 338 | 128 |     path.join(process.cwd(), ".gitignore"),
1751 | 1279 | 807 | 339 | 129 |     "utf8"
1752 | 1280 | 808 | 340 | 130 |   )
1753 | 1281 | 809 | 341 | 131 |   isIgnored = gitignoreParser.compile(gitignoreContent)
1754 | 1282 | 810 | 342 | 132 | } catch {
1755 | 1283 | 811 | 343 | 133 |   // .gitignore not found or unreadable
1756 | 1284 | 812 | 344 | 134 |   // fallback to a function that never ignores
1757 | 1285 | 813 | 345 | 135 |   isIgnored = () => false
1758 | 1286 | 814 | 346 | 136 | }
1759 | 1287 | 815 | 347 | 137 | 
1760 | 1288 | 816 | 348 | 138 | /**
1761 | 1289 | 817 | 349 | 139 |  * Recursively collect all files in the current working directory,
1762 | 1290 | 818 | 350 | 140 |  * ignoring anything matched by .gitignore (if present).
1763 | 1291 | 819 | 351 | 141 |  */
1764 | 1292 | 820 | 352 | 142 | function collectFiles(dir) {
1765 | 1293 | 821 | 353 | 143 |   let results = []
1766 | 1294 | 822 | 354 | 144 |   const list = fs.readdirSync(dir)
1767 | 1295 | 823 | 355 | 145 | 
1768 | 1296 | 824 | 356 | 146 |   for (const filename of list) {
1769 | 1297 | 825 | 357 | 147 |     // Full path
1770 | 1298 | 826 | 358 | 148 |     const filePath = path.join(dir, filename)
1771 | 1299 | 827 | 359 | 149 |     // Relative path from CWD (for ignoring logic)
1772 | 1300 | 828 | 360 | 150 |     const relPath = path.relative(process.cwd(), filePath)
1773 | 1301 | 829 | 361 | 151 | 
1774 | 1302 | 830 | 362 | 152 |     // If ignored by .gitignore, skip
1775 | 1303 | 831 | 363 | 153 |     if (isIgnored(relPath)) {
1776 | 1304 | 832 | 364 | 154 |       continue
1777 | 1305 | 833 | 365 | 155 |     }
1778 | 1306 | 834 | 366 | 156 | 
1779 | 1307 | 835 | 367 | 157 |     const stat = fs.statSync(filePath)
1780 | 1308 | 836 | 368 | 158 | 
1781 | 1309 | 837 | 369 | 159 |     if (stat.isDirectory()) {
1782 | 1310 | 838 | 370 | 160 |       // Recurse into subdirectory
1783 | 1311 | 839 | 371 | 161 |       results = results.concat(collectFiles(filePath))
1784 | 1312 | 840 | 372 | 162 |     } else {
1785 | 1313 | 841 | 373 | 163 |       // It's a file
1786 | 1314 | 842 | 374 | 164 |       results.push(filePath)
1787 | 1315 | 843 | 375 | 165 |     }
1788 | 1316 | 844 | 376 | 166 |   }
1789 | 1317 | 845 | 377 | 167 |   return results
1790 | 1318 | 846 | 378 | 168 | }
1791 | 1319 | 847 | 379 | 169 | 
1792 | 1320 | 848 | 380 | 170 | // Actually gather up the file list
1793 | 1321 | 849 | 381 | 171 | const allFiles = collectFiles(process.cwd())
1794 | 1322 | 850 | 382 | 172 | 
1795 | 1323 | 851 | 383 | 173 | /**
1796 | 1324 | 852 | 384 | 174 |  * Generate the final markdown content.
1797 | 1325 | 853 | 385 | 175 |  * We replicate the style:
1798 | 1326 | 854 | 386 | 176 |  *
1799 | 1327 | 855 | 387 | 177 |  * /path/to/file:
1800 | 1328 | 856 | 388 | 178 |  * --------------------------------------------------------------------------------
1801 | 1329 | 857 | 389 | 179 |  * 1 | ...
1802 | 1330 | 858 | 390 | 180 |  * 2 | ...
1803 | 1331 | 859 | 391 | 181 |  * --------------------------------------------------------------------------------
1804 | 1332 | 860 | 392 | 182 |  *
1805 | 1333 | 861 | 393 | 183 |  */
1806 | 1334 | 862 | 394 | 184 | function generateMarkdown(files) {
1807 | 1335 | 863 | 395 | 185 |   const lines = []
1808 | 1336 | 864 | 396 | 186 | 
1809 | 1337 | 865 | 397 | 187 |   for (const file of files) {
1810 | 1338 | 866 | 398 | 188 |     // Turn absolute path into something relative
1811 | 1339 | 867 | 399 | 189 |     const relativePath = path.relative(process.cwd(), file)
1812 | 1340 | 868 | 400 | 190 |     const content = fs.readFileSync(file, "utf8")
1813 | 1341 | 869 | 401 | 191 | 
1814 | 1342 | 870 | 402 | 192 |     // Start of file block
1815 | 1343 | 871 | 403 | 193 |     lines.push(`/${relativePath}:`)
1816 | 1344 | 872 | 404 | 194 |     lines.push("--------------------------------------------------------------------------------")
1817 | 1345 | 873 | 405 | 195 | 
1818 | 1346 | 874 | 406 | 196 |     // Add line numbers
1819 | 1347 | 875 | 407 | 197 |     const fileLines = content.split("\n")
1820 | 1348 | 876 | 408 | 198 |     fileLines.forEach((line, i) => {
1821 | 1349 | 877 | 409 | 199 |       // +1 because line numbers start at 1
1822 | 1350 | 878 | 410 | 200 |       lines.push(`${i + 1} | ${line}`)
1823 | 1351 | 879 | 411 | 201 |     })
1824 | 1352 | 880 | 412 | 202 | 
1825 | 1353 | 881 | 413 | 203 |     lines.push("")
1826 | 1354 | 882 | 414 | 204 |     lines.push("--------------------------------------------------------------------------------")
1827 | 1355 | 883 | 415 | 205 |   }
1828 | 1356 | 884 | 416 | 206 | 
1829 | 1357 | 885 | 417 | 207 |   return lines.join("\n")
1830 | 1358 | 886 | 418 | 208 | }
1831 | 1359 | 887 | 419 | 209 | 
1832 | 1360 | 888 | 420 | 210 | // Build the final output
1833 | 1361 | 889 | 421 | 211 | const final = generateMarkdown(allFiles)
1834 | 1362 | 890 | 422 | 212 | 
1835 | 1363 | 891 | 423 | 213 | // Write to file if `-o/--output` was given, else print to stdout
1836 | 1364 | 892 | 424 | 214 | if (output) {
1837 | 1365 | 893 | 425 | 215 |   fs.writeFileSync(output, final, "utf8")
1838 | 1366 | 894 | 426 | 216 |   console.log(`All files are written to ${output}.`)
1839 | 1367 | 895 | 427 | 217 | } else {
1840 | 1368 | 896 | 428 | 218 |   console.log(final)
1841 | 1369 | 897 | 429 | 219 | }
1842 | 1370 | 898 | 430 | 220 | How to Use Locally or in a WebContainer
1843 | 1371 | 899 | 431 | 221 | Install dependencies
1844 | 1372 | 900 | 432 | 222 | bash
1845 | 1373 | 901 | 433 | 223 | Copy code
1846 | 1374 | 902 | 434 | 224 | npm install
1847 | 1375 | 903 | 435 | 225 | Link (optional, for local testing)
1848 | 1376 | 904 | 436 | 226 | bash
1849 | 1377 | 905 | 437 | 227 | Copy code
1850 | 1378 | 906 | 438 | 228 | npm link
1851 | 1379 | 907 | 439 | 229 | # Now you can run `boltfetch` in this directory
1852 | 1380 | 908 | 440 | 230 | Or just run directly
1853 | 1381 | 909 | 441 | 231 | bash
1854 | 1382 | 910 | 442 | 232 | Copy code
1855 | 1383 | 911 | 443 | 233 | node index.js -o my-complete-source.md
1856 | 1384 | 912 | 444 | 234 | From a WebContainer (like StackBlitz):
1857 | 1385 | 913 | 445 | 235 | bash
1858 | 1386 | 914 | 446 | 236 | Copy code
1859 | 1387 | 915 | 447 | 237 | npx boltfetch -o my-complete-source.md
1860 | 1388 | 916 | 448 | 238 | This will create my-complete-source.md containing the entire project (except files ignored by .gitignore).
1861 | 1389 | 917 | 449 | 239 | Publish to npm
1862 | 1390 | 918 | 450 | 240 | If you want to publish this so that anyone can run npx boltfetch:
1863 | 1391 | 919 | 451 | 241 | 
1864 | 1392 | 920 | 452 | 242 | Make sure you have an npm account (and have run npm login).
1865 | 1393 | 921 | 453 | 243 | Bump the version in package.json as needed.
1866 | 1394 | 922 | 454 | 244 | Run:
1867 | 1395 | 923 | 455 | 245 | bash
1868 | 1396 | 924 | 456 | 246 | Copy code
1869 | 1397 | 925 | 457 | 247 | npm publish
1870 | 1398 | 926 | 458 | 248 | Now, from any environment:
1871 | 1399 | 927 | 459 | 249 | bash
1872 | 1400 | 928 | 460 | 250 | Copy code
1873 | 1401 | 929 | 461 | 251 | npx boltfetch -o my-complete-source.md
1874 | 1402 | 930 | 462 | 252 | will grab your published CLI and run it!
1875 | 1403 | 931 | 463 | 253 | 
1876 | 1404 | 932 | 464 | 
1877 | 1405 | 933 | 465 | --------------------------------------------------------------------------------
1878 | 1406 | 934 | 466 | /package-lock.json:
1879 | 1407 | 935 | 467 | --------------------------------------------------------------------------------
1880 | 1408 | 936 | 468 | 1 | {
1881 | 1409 | 937 | 469 | 2 |   "name": "boltfetch",
1882 | 1410 | 938 | 470 | 3 |   "version": "1.0.0",
1883 | 1411 | 939 | 471 | 4 |   "lockfileVersion": 3,
1884 | 1412 | 940 | 472 | 5 |   "requires": true,
1885 | 1413 | 941 | 473 | 6 |   "packages": {
1886 | 1414 | 942 | 474 | 7 |     "": {
1887 | 1415 | 943 | 475 | 8 |       "name": "boltfetch",
1888 | 1416 | 944 | 476 | 9 |       "version": "1.0.0",
1889 | 1417 | 945 | 477 | 10 |       "license": "MIT",
1890 | 1418 | 946 | 478 | 11 |       "dependencies": {
1891 | 1419 | 947 | 479 | 12 |         "ignore": "^5.3.0"
1892 | 1420 | 948 | 480 | 13 |       },
1893 | 1421 | 949 | 481 | 14 |       "bin": {
1894 | 1422 | 950 | 482 | 15 |         "boltfetch": "index.js"
1895 | 1423 | 951 | 483 | 16 |       }
1896 | 1424 | 952 | 484 | 17 |     },
1897 | 1425 | 953 | 485 | 18 |     "node_modules/ignore": {
1898 | 1426 | 954 | 486 | 19 |       "version": "5.3.2",
1899 | 1427 | 955 | 487 | 20 |       "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
1900 | 1428 | 956 | 488 | 21 |       "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
1901 | 1429 | 957 | 489 | 22 |       "license": "MIT",
1902 | 1430 | 958 | 490 | 23 |       "engines": {
1903 | 1431 | 959 | 491 | 24 |         "node": ">= 4"
1904 | 1432 | 960 | 492 | 25 |       }
1905 | 1433 | 961 | 493 | 26 |     }
1906 | 1434 | 962 | 494 | 27 |   }
1907 | 1435 | 963 | 495 | 28 | }
1908 | 1436 | 964 | 496 | 29 | 
1909 | 1437 | 965 | 497 | 
1910 | 1438 | 966 | 498 | --------------------------------------------------------------------------------
1911 | 1439 | 967 | 499 | /package.json:
1912 | 1440 | 968 | 500 | --------------------------------------------------------------------------------
1913 | 1441 | 969 | 501 | 1 | {
1914 | 1442 | 970 | 502 | 2 |   "name": "boltfetch",
1915 | 1443 | 971 | 503 | 3 |   "version": "1.0.0",
1916 | 1444 | 972 | 504 | 4 |   "description": "Fetches all files in the current directory and outputs them in a Markdown file.",
1917 | 1445 | 973 | 505 | 5 |   "bin": {
1918 | 1446 | 974 | 506 | 6 |     "boltfetch": "./index.js"
1919 | 1447 | 975 | 507 | 7 |   },
1920 | 1448 | 976 | 508 | 8 |   "type": "module",
1921 | 1449 | 977 | 509 | 9 |   "keywords": [
1922 | 1450 | 978 | 510 | 10 |     "boltfetch",
1923 | 1451 | 979 | 511 | 11 |     "cli",
1924 | 1452 | 980 | 512 | 12 |     "markdown",
1925 | 1453 | 981 | 513 | 13 |     "source-code"
1926 | 1454 | 982 | 514 | 14 |   ],
1927 | 1455 | 983 | 515 | 15 |   "author": "Your Name <you@example.com>",
1928 | 1456 | 984 | 516 | 16 |   "license": "MIT",
1929 | 1457 | 985 | 517 | 17 |   "dependencies": {
1930 | 1458 | 986 | 518 | 18 |     "ignore": "^5.3.0"
1931 | 1459 | 987 | 519 | 19 |   }
1932 | 1460 | 988 | 520 | 20 | }
1933 | 1461 | 989 | 521 | 21 | 
1934 | 1462 | 990 | 522 | 
1935 | 1463 | 991 | 523 | --------------------------------------------------------------------------------
1936 | 1464 | 992 | 
1937 | 1465 | 993 | --------------------------------------------------------------------------------
1938 | 1466 | 994 | /package-lock.json:
1939 | 1467 | 995 | --------------------------------------------------------------------------------
1940 | 1468 | 996 | 1 | {
1941 | 1469 | 997 | 2 |   "name": "boltfetch",
1942 | 1470 | 998 | 3 |   "version": "1.0.0",
1943 | 1471 | 999 | 4 |   "lockfileVersion": 3,
1944 | 1472 | 1000 | 5 |   "requires": true,
1945 | 1473 | 1001 | 6 |   "packages": {
1946 | 1474 | 1002 | 7 |     "": {
1947 | 1475 | 1003 | 8 |       "name": "boltfetch",
1948 | 1476 | 1004 | 9 |       "version": "1.0.0",
1949 | 1477 | 1005 | 10 |       "license": "MIT",
1950 | 1478 | 1006 | 11 |       "dependencies": {
1951 | 1479 | 1007 | 12 |         "ignore": "^5.3.0"
1952 | 1480 | 1008 | 13 |       },
1953 | 1481 | 1009 | 14 |       "bin": {
1954 | 1482 | 1010 | 15 |         "boltfetch": "index.js"
1955 | 1483 | 1011 | 16 |       }
1956 | 1484 | 1012 | 17 |     },
1957 | 1485 | 1013 | 18 |     "node_modules/ignore": {
1958 | 1486 | 1014 | 19 |       "version": "5.3.2",
1959 | 1487 | 1015 | 20 |       "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
1960 | 1488 | 1016 | 21 |       "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
1961 | 1489 | 1017 | 22 |       "license": "MIT",
1962 | 1490 | 1018 | 23 |       "engines": {
1963 | 1491 | 1019 | 24 |         "node": ">= 4"
1964 | 1492 | 1020 | 25 |       }
1965 | 1493 | 1021 | 26 |     }
1966 | 1494 | 1022 | 27 |   }
1967 | 1495 | 1023 | 28 | }
1968 | 1496 | 1024 | 29 | 
1969 | 1497 | 1025 | 
1970 | 1498 | 1026 | --------------------------------------------------------------------------------
1971 | 1499 | 1027 | /package.json:
1972 | 1500 | 1028 | --------------------------------------------------------------------------------
1973 | 1501 | 1029 | 1 | {
1974 | 1502 | 1030 | 2 |   "name": "boltfetch",
1975 | 1503 | 1031 | 3 |   "version": "1.0.0",
1976 | 1504 | 1032 | 4 |   "description": "Fetches all files in the current directory and outputs them in a Markdown file.",
1977 | 1505 | 1033 | 5 |   "bin": {
1978 | 1506 | 1034 | 6 |     "boltfetch": "./index.js"
1979 | 1507 | 1035 | 7 |   },
1980 | 1508 | 1036 | 8 |   "type": "module",
1981 | 1509 | 1037 | 9 |   "keywords": [
1982 | 1510 | 1038 | 10 |     "boltfetch",
1983 | 1511 | 1039 | 11 |     "cli",
1984 | 1512 | 1040 | 12 |     "markdown",
1985 | 1513 | 1041 | 13 |     "source-code"
1986 | 1514 | 1042 | 14 |   ],
1987 | 1515 | 1043 | 15 |   "author": "Your Name <you@example.com>",
1988 | 1516 | 1044 | 16 |   "license": "MIT",
1989 | 1517 | 1045 | 17 |   "dependencies": {
1990 | 1518 | 1046 | 18 |     "ignore": "^5.3.0"
1991 | 1519 | 1047 | 19 |   }
1992 | 1520 | 1048 | 20 | }
1993 | 1521 | 1049 | 21 | 
1994 | 1522 | 1050 | 
1995 | 1523 | 1051 | --------------------------------------------------------------------------------
1996 | 1524 | 
1997 | 1525 | --------------------------------------------------------------------------------
1998 | 1526 | /package-lock.json:
1999 | 1527 | --------------------------------------------------------------------------------
2000 | 1528 | 1 | {
2001 | 1529 | 2 |   "name": "boltfetch",
2002 | 1530 | 3 |   "version": "1.0.0",
2003 | 1531 | 4 |   "lockfileVersion": 3,
2004 | 1532 | 5 |   "requires": true,
2005 | 1533 | 6 |   "packages": {
2006 | 1534 | 7 |     "": {
2007 | 1535 | 8 |       "name": "boltfetch",
2008 | 1536 | 9 |       "version": "1.0.0",
2009 | 1537 | 10 |       "license": "MIT",
2010 | 1538 | 11 |       "dependencies": {
2011 | 1539 | 12 |         "ignore": "^5.3.0"
2012 | 1540 | 13 |       },
2013 | 1541 | 14 |       "bin": {
2014 | 1542 | 15 |         "boltfetch": "index.js"
2015 | 1543 | 16 |       }
2016 | 1544 | 17 |     },
2017 | 1545 | 18 |     "node_modules/ignore": {
2018 | 1546 | 19 |       "version": "5.3.2",
2019 | 1547 | 20 |       "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
2020 | 1548 | 21 |       "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
2021 | 1549 | 22 |       "license": "MIT",
2022 | 1550 | 23 |       "engines": {
2023 | 1551 | 24 |         "node": ">= 4"
2024 | 1552 | 25 |       }
2025 | 1553 | 26 |     }
2026 | 1554 | 27 |   }
2027 | 1555 | 28 | }
2028 | 1556 | 29 | 
2029 | 1557 | 
2030 | 1558 | --------------------------------------------------------------------------------
2031 | 1559 | /package.json:
2032 | 1560 | --------------------------------------------------------------------------------
2033 | 1561 | 1 | {
2034 | 1562 | 2 |   "name": "boltfetch",
2035 | 1563 | 3 |   "version": "1.0.0",
2036 | 1564 | 4 |   "description": "Fetches all files in the current directory and outputs them in a Markdown file.",
2037 | 1565 | 5 |   "bin": {
2038 | 1566 | 6 |     "boltfetch": "./index.js"
2039 | 1567 | 7 |   },
2040 | 1568 | 8 |   "type": "module",
2041 | 1569 | 9 |   "keywords": [
2042 | 1570 | 10 |     "boltfetch",
2043 | 1571 | 11 |     "cli",
2044 | 1572 | 12 |     "markdown",
2045 | 1573 | 13 |     "source-code"
2046 | 1574 | 14 |   ],
2047 | 1575 | 15 |   "author": "Your Name <you@example.com>",
2048 | 1576 | 16 |   "license": "MIT",
2049 | 1577 | 17 |   "dependencies": {
2050 | 1578 | 18 |     "ignore": "^5.3.0"
2051 | 1579 | 19 |   }
2052 | 1580 | 20 | }
2053 | 1581 | 21 | 
2054 | 1582 | 
2055 | 1583 | --------------------------------------------------------------------------------
2056 | 
2057 | --------------------------------------------------------------------------------
2058 | /package-lock.json:
2059 | --------------------------------------------------------------------------------
2060 | 1 | {
2061 | 2 |   "name": "boltfetch",
2062 | 3 |   "version": "1.0.0",
2063 | 4 |   "lockfileVersion": 3,
2064 | 5 |   "requires": true,
2065 | 6 |   "packages": {
2066 | 7 |     "": {
2067 | 8 |       "name": "boltfetch",
2068 | 9 |       "version": "1.0.0",
2069 | 10 |       "license": "MIT",
2070 | 11 |       "dependencies": {
2071 | 12 |         "ignore": "^5.3.0"
2072 | 13 |       },
2073 | 14 |       "bin": {
2074 | 15 |         "boltfetch": "index.js"
2075 | 16 |       }
2076 | 17 |     },
2077 | 18 |     "node_modules/ignore": {
2078 | 19 |       "version": "5.3.2",
2079 | 20 |       "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
2080 | 21 |       "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
2081 | 22 |       "license": "MIT",
2082 | 23 |       "engines": {
2083 | 24 |         "node": ">= 4"
2084 | 25 |       }
2085 | 26 |     }
2086 | 27 |   }
2087 | 28 | }
2088 | 29 | 
2089 | 
2090 | --------------------------------------------------------------------------------
2091 | /package.json:
2092 | --------------------------------------------------------------------------------
2093 | 1 | {
2094 | 2 |   "name": "boltfetch",
2095 | 3 |   "version": "1.0.0",
2096 | 4 |   "description": "Fetches all files in the current directory and outputs them in a Markdown file.",
2097 | 5 |   "bin": {
2098 | 6 |     "boltfetch": "./index.js"
2099 | 7 |   },
2100 | 8 |   "type": "module",
2101 | 9 |   "keywords": [
2102 | 10 |     "boltfetch",
2103 | 11 |     "cli",
2104 | 12 |     "markdown",
2105 | 13 |     "source-code"
2106 | 14 |   ],
2107 | 15 |   "author": "Your Name <you@example.com>",
2108 | 16 |   "license": "MIT",
2109 | 17 |   "dependencies": {
2110 | 18 |     "ignore": "^5.3.0"
2111 | 19 |   }
2112 | 20 | }
2113 | 21 | 
2114 | 
2115 | --------------------------------------------------------------------------------

--------------------------------------------------------------------------------
/package-lock.json:
--------------------------------------------------------------------------------
1 | {
2 |   "name": "boltfetch",
3 |   "version": "1.0.0",
4 |   "lockfileVersion": 3,
5 |   "requires": true,
6 |   "packages": {
7 |     "": {
8 |       "name": "boltfetch",
9 |       "version": "1.0.0",
10 |       "license": "MIT",
11 |       "dependencies": {
12 |         "ignore": "^5.3.0"
13 |       },
14 |       "bin": {
15 |         "boltfetch": "index.js"
16 |       }
17 |     },
18 |     "node_modules/ignore": {
19 |       "version": "5.3.2",
20 |       "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
21 |       "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
22 |       "license": "MIT",
23 |       "engines": {
24 |         "node": ">= 4"
25 |       }
26 |     }
27 |   }
28 | }
29 | 

--------------------------------------------------------------------------------
/package.json:
--------------------------------------------------------------------------------
1 | {
2 |   "name": "boltfetch",
3 |   "version": "1.0.0",
4 |   "description": "Fetches all files in the current directory and outputs them in a Markdown file.",
5 |   "bin": {
6 |     "boltfetch": "./index.js"
7 |   },
8 |   "type": "module",
9 |   "keywords": [
10 |     "boltfetch",
11 |     "cli",
12 |     "markdown",
13 |     "source-code"
14 |   ],
15 |   "author": "Your Name <you@example.com>",
16 |   "license": "MIT",
17 |   "dependencies": {
18 |     "ignore": "^5.3.0"
19 |   }
20 | }
21 | 

--------------------------------------------------------------------------------