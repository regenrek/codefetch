import { Tiktoken } from 'js-tiktoken/lite';

class FetchResultImpl {
  constructor(root, metadata) {
    this.root = root;
    this.metadata = metadata;
  }
  /**
   * Get a file node by its path
   */
  getFileByPath(path) {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    function searchNode(node, currentPath) {
      const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;
      if (node.type === "file" && nodePath === normalizedPath) {
        return node;
      }
      if (node.type === "directory" && node.children) {
        for (const child of node.children) {
          const result = searchNode(child, nodePath);
          if (result) return result;
        }
      }
      return null;
    }
    if (normalizedPath === "" || normalizedPath === "/") {
      return this.root;
    }
    if (this.root.children) {
      for (const child of this.root.children) {
        const result = searchNode(child, "");
        if (result) return result;
      }
    }
    return null;
  }
  /**
   * Get all files as a flat array
   */
  getAllFiles() {
    const files = [];
    function collectFiles(node) {
      if (node.type === "file") {
        files.push(node);
      } else if (node.type === "directory" && node.children) {
        for (const child of node.children) {
          collectFiles(child);
        }
      }
    }
    collectFiles(this.root);
    return files;
  }
  /**
   * Convert to markdown format
   */
  toMarkdown() {
    const lines = [];
    lines.push("Project Structure:");
    lines.push(this.buildTreeString(this.root));
    lines.push("");
    const files = this.getAllFiles();
    for (const file of files) {
      if (file.content) {
        lines.push(`${file.path}`);
        lines.push("```");
        const contentLines = file.content.split("\n");
        for (const [index, line] of contentLines.entries()) {
          lines.push(`${index + 1} | ${line}`);
        }
        lines.push("```");
        lines.push("");
      }
    }
    return lines.join("\n");
  }
  /**
   * Build tree string representation
   */
  buildTreeString(node, prefix = "", isLast = true) {
    const lines = [];
    if (node.name) {
      const connector = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
      lines.push(prefix + connector + node.name);
    }
    if (node.type === "directory" && node.children) {
      const extension = node.name ? isLast ? "    " : "\u2502   " : "";
      const newPrefix = prefix + extension;
      for (const [index, child] of node.children.entries()) {
        const childIsLast = index === node.children.length - 1;
        lines.push(this.buildTreeString(child, newPrefix, childIsLast));
      }
    }
    return lines.join("\n");
  }
}

let tokenizer = null;
const initTokenizer = async () => {
  if (!tokenizer) {
    const response = await fetch(
      "https://tiktoken.pages.dev/js/p50k_base.json"
    );
    const rank = await response.json();
    tokenizer = new Tiktoken(rank);
  }
  return tokenizer;
};
const estimateTokens = (text) => {
  return text.split(/[\s\p{P}]+/u).filter(Boolean).length;
};
const getTokenCount = async (text, encoder) => {
  if (!text) return 0;
  if (encoder === "simple") {
    return estimateTokens(text);
  }
  const tiktoken = await initTokenizer();
  return tiktoken.encode(text).length;
};
const countTokens = async (text, encoder) => {
  if (!encoder || !text) return 0;
  return getTokenCount(text, encoder);
};
const SUPPORTED_MODELS = {
  simple: ["*"],
  p50k: ["text-davinci-003", "text-davinci-002", "code-davinci-002"],
  o200k: [
    "gpt-4o-2024-11-20",
    "gpt-4o-2024-08-06",
    "gpt-4o-2024-05-13",
    "gpt-4o-mini-2024-07-18"
  ],
  cl100k: ["gpt-4", "gpt-3.5-turbo", "gpt-35-turbo"]
};

const detectLanguage = (fileName) => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const languageMap = {
    // JavaScript/TypeScript
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    mjs: "javascript",
    cjs: "javascript",
    mts: "typescript",
    cts: "typescript",
    // Web
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    // Config
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    xml: "xml",
    ini: "ini",
    conf: "conf",
    // Programming languages
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    go: "go",
    rs: "rust",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    r: "r",
    lua: "lua",
    dart: "dart",
    // Shell
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "fish",
    ps1: "powershell",
    // Documentation
    md: "markdown",
    mdx: "markdown",
    rst: "restructuredtext",
    tex: "latex",
    // Other
    sql: "sql",
    dockerfile: "dockerfile",
    makefile: "makefile",
    cmake: "cmake",
    gradle: "gradle",
    vim: "vim",
    vue: "vue",
    svelte: "svelte"
  };
  const fileNameLower = fileName.toLowerCase();
  if (fileNameLower === "dockerfile") return "dockerfile";
  if (fileNameLower === "makefile") return "makefile";
  if (fileNameLower === "cmakelists.txt") return "cmake";
  return languageMap[ext || ""] || "text";
};

async function generateMarkdownFromContent(files, options = {}) {
  const {
    maxTokens,
    includeTreeStructure = false,
    tokenEncoder = "cl100k",
    disableLineNumbers = false
  } = options;
  let markdown = "";
  let totalTokens = 0;
  if (includeTreeStructure) {
    markdown += "# Project Structure\n\n```\n";
    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));
    const tree = /* @__PURE__ */ new Map();
    for (const file of sortedFiles) {
      const parts = file.path.split("/");
      const fileName = parts.pop();
      const dir = parts.join("/") || ".";
      if (!tree.has(dir)) {
        tree.set(dir, []);
      }
      tree.get(dir).push(fileName);
    }
    for (const [dir, fileNames] of tree) {
      if (dir !== ".") {
        markdown += `${dir}/
`;
      }
      for (const fileName of fileNames) {
        const indent = dir === "." ? "" : "  ";
        markdown += `${indent}${fileName}
`;
      }
    }
    markdown += "```\n\n";
  }
  markdown += "# File Contents\n\n";
  for (const file of files) {
    if (maxTokens && totalTokens >= maxTokens) {
      markdown += `
... Remaining files truncated due to token limit (${maxTokens}) ...
`;
      break;
    }
    const language = detectLanguage(file.path);
    const lines = file.content.split("\n");
    markdown += `## ${file.path}

`;
    markdown += `\`\`\`${language}
`;
    if (disableLineNumbers) {
      markdown += file.content;
    } else {
      const paddingWidth = Math.max(4, lines.length.toString().length + 1);
      for (const [i, line] of lines.entries()) {
        const lineNumber = (i + 1).toString().padStart(paddingWidth, " ");
        markdown += `${lineNumber} ${line}
`;
      }
    }
    markdown += "\n```\n\n";
    const fileTokens = await countTokens(markdown, tokenEncoder);
    totalTokens = fileTokens;
    if (maxTokens && totalTokens > maxTokens) {
      const excess = totalTokens - maxTokens;
      const approximateCharsPerToken = 4;
      const charsToRemove = excess * approximateCharsPerToken;
      markdown = markdown.slice(0, -charsToRemove);
      markdown += "\n... File truncated due to token limit ...\n```\n\n";
      break;
    }
  }
  return markdown.trim();
}

const VALID_PROMPTS = /* @__PURE__ */ new Set([
  "default",
  "fix",
  "improve",
  "testgen",
  "codegen"
]);
const VALID_ENCODERS = /* @__PURE__ */ new Set(["simple", "p50k", "o200k", "cl100k"]);
const VALID_LIMITERS = /* @__PURE__ */ new Set(["sequential", "truncated"]);

const codegenPrompt = `You are a senior developer. You produce optimized, maintainable code that follows best practices. 

Your task is to write code according to my instructions for the current codebase.

instructions:
<message>
{{MESSAGE}}
</message>

Rules:
- Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. 
- Your output should be a series of specific, actionable changes.

When approaching this task:
1. Carefully review the provided code.
2. Identify the area thats raising this issue or error and provide a fix.
3. Consider best practices for the specific programming language used.

For each suggested change, provide:
1. A short description of the change (one line maximum).
2. The modified code block.

Use the following format for your output:

[Short Description]
\`\`\`[language]:[path/to/file]
[code block]
\`\`\`

Begin fixing the codebase provide your solutions.

My current codebase:
<current_codebase>
{{CURRENT_CODEBASE}}
</current_codebase>
`;

const fixPrompt = `You are a senior developer. You produce optimized, maintainable code that follows best practices. 

Your task is to review the current codebase and fix the current issues.

Current Issue:
<issue>
{{MESSAGE}}
</issue>

Rules:
- Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. 
- Your output should be a series of specific, actionable changes.

When approaching this task:
1. Carefully review the provided code.
2. Identify the area thats raising this issue or error and provide a fix.
3. Consider best practices for the specific programming language used.

For each suggested change, provide:
1. A short description of the change (one line maximum).
2. The modified code block.

Use the following format for your output:

[Short Description]
\`\`\`[language]:[path/to/file]
[code block]
\`\`\`

Begin fixing the codebase provide your solutions.

My current codebase:
<current_codebase>
{{CURRENT_CODEBASE}}
</current_codebase>
`;

const improvePrompt = `You are a senior software architect. You produce optimized, maintainable code that follows best practices. 

Your task is to review the current codebase and suggest improvements or optimizations.

Rules:
- Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. 
- Your output should be a series of specific, actionable changes.

When approaching this task:
1. Carefully review the provided code.
2. Identify areas that could be improved in terms of efficiency, readability, or maintainability.
3. Consider best practices for the specific programming language used.
4. Think about potential optimizations that could enhance performance.
5. Look for opportunities to refactor or restructure the code for better organization.

For each suggested change, provide:
1. A short description of the change (one line maximum).
2. The modified code block.

Use the following format for your output:

[Short Description]
\`\`\`[language]:[path/to/file]
[code block]
\`\`\`

Begin your analysis and provide your suggestions now.

My current codebase:
<current_codebase>
{{CURRENT_CODEBASE}}
</current_codebase>
`;

const testgenPrompt = `You are a senior test developer. You produce optimized, maintainable code that follows best practices. 

Your task is to review the current codebase and create and improve missing tests for the codebase.

Additional instructions:
<message>
{{MESSAGE}}
</message>

Rules:
- Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. 
- Your output should be a series of specific, actionable changes.

When approaching this task:
1. Carefully review the provided code.
2. Identify the area thats raising this issue or error and provide a fix.
3. Consider best practices for the specific programming language used.

For each suggested change, provide:
1. A short description of the change (one line maximum).
2. The modified code block.

Use the following format for your output:

[Short Description]
\`\`\`[language]:[path/to/file]
[code block]
\`\`\`

Begin fixing the codebase provide your solutions.

My current codebase:
<current_codebase>
{{CURRENT_CODEBASE}}
</current_codebase>
`;

const prompts = {
  codegen: codegenPrompt,
  fix: fixPrompt,
  improve: improvePrompt,
  testgen: testgenPrompt
};

export { FetchResultImpl, SUPPORTED_MODELS, VALID_ENCODERS, VALID_LIMITERS, VALID_PROMPTS, codegenPrompt, countTokens, detectLanguage, fixPrompt, generateMarkdownFromContent, improvePrompt, prompts, testgenPrompt };
