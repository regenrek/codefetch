import { Tiktoken } from 'js-tiktoken/lite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, readFile, stat, writeFile, rm, readdir } from 'node:fs/promises';
import 'node:fs';
import 'pathe';

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

const tokenizerCache = /* @__PURE__ */ new Map();
const getTokenizer = async (encoder) => {
  if (tokenizerCache.has(encoder)) {
    return tokenizerCache.get(encoder);
  }
  const encoderFiles = {
    p50k: "p50k_base.json",
    o200k: "o200k_base.json",
    cl100k: "cl100k_base.json"
  };
  const fileName = encoderFiles[encoder];
  if (!fileName) {
    throw new Error(`Unsupported token encoder: ${encoder}`);
  }
  const response = await fetch(`https://tiktoken.pages.dev/js/${fileName}`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch tokenizer file for ${encoder}: ${response.statusText}`
    );
  }
  const rank = await response.json();
  const tokenizer = new Tiktoken(rank);
  tokenizerCache.set(encoder, tokenizer);
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
  const tiktoken = await getTokenizer(encoder);
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

function isIPv4(str) {
  const parts = str.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const num = Number.parseInt(part, 10);
    return !Number.isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
  });
}
function isIPv6(str) {
  const parts = str.split(":");
  if (parts.length < 3 || parts.length > 8) return false;
  const hexPattern = /^[0-9a-fA-F]{0,4}$/;
  return parts.every((part) => hexPattern.test(part));
}
const GIT_PROVIDERS = {
  github: /^https:\/\/github\.com\/([\w-]+)\/([\w.-]+)/,
  gitlab: /^https:\/\/gitlab\.com\/([\w-]+)\/([\w.-]+)/,
  bitbucket: /^https:\/\/bitbucket\.org\/([\w-]+)\/([\w.-]+)/
};
const BLOCKED_PATTERNS = [
  /^file:\/\//i,
  /^ftp:\/\//i,
  /^ssh:\/\//i,
  /^telnet:\/\//i
];
const BLOCKED_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const PRIVATE_IP_RANGES = [
  /^10\./,
  // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  // 172.16.0.0/12
  /^192\.168\./,
  // 192.168.0.0/16
  /^169\.254\./,
  // 169.254.0.0/16 (link-local)
  /^fc00:/i,
  // IPv6 private
  /^fe80:/i
  // IPv6 link-local
];
function normalizeURLString(urlString) {
  if (!/^[a-zA-Z]+:\/\//.test(urlString)) {
    return `https://${urlString}`;
  }
  return urlString;
}
function validateURL(urlString) {
  try {
    const normalizedUrlString = normalizeURLString(urlString);
    const url = new URL(normalizedUrlString);
    if (!["http:", "https:"].includes(url.protocol)) {
      return {
        valid: false,
        error: `Invalid protocol: ${url.protocol}. Only HTTP and HTTPS are allowed.`
      };
    }
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(urlString)) {
        return { valid: false, error: "URL contains blocked pattern" };
      }
    }
    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(hostname)) {
      return { valid: false, error: `Blocked hostname: ${hostname}` };
    }
    if (isIPv4(hostname) || isIPv6(hostname)) {
      for (const range of PRIVATE_IP_RANGES) {
        if (range.test(hostname)) {
          return {
            valid: false,
            error: `Private IP address not allowed: ${hostname}`
          };
        }
      }
    }
    if (hostname.includes("..") || urlString.includes("..")) {
      return {
        valid: false,
        error: "URL contains suspicious path traversal patterns"
      };
    }
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid URL format: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
function detectGitProvider(urlString) {
  for (const [provider, pattern] of Object.entries(GIT_PROVIDERS)) {
    if (pattern.test(urlString)) {
      return provider;
    }
  }
  return null;
}
function parseURL(urlString) {
  const normalizedUrlString = normalizeURLString(urlString);
  const validation = validateURL(urlString);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const url = new URL(normalizedUrlString);
  const gitProvider = detectGitProvider(normalizedUrlString);
  if (!gitProvider) {
    throw new Error(
      "Only GitHub, GitLab, and Bitbucket repository URLs are supported. Please provide a valid git repository URL (e.g., https://github.com/owner/repo)"
    );
  }
  const match = normalizedUrlString.match(GIT_PROVIDERS[gitProvider]);
  if (!match) {
    throw new Error("Failed to parse git repository URL");
  }
  const [, owner, repo] = match;
  let gitRef;
  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts.length > 2) {
    const refType = pathParts[2];
    if (["tree", "commit", "blob"].includes(refType) && pathParts[3]) {
      gitRef = pathParts.slice(3).join("/");
    } else if (pathParts[2] === "releases" && pathParts[3] === "tag" && pathParts[4]) {
      gitRef = pathParts[4];
    }
  }
  const repoName = repo.replace(/\.git$/, "");
  const normalizedUrl = `https://${gitProvider}.com/${owner}/${repoName}`;
  return {
    type: "git-repository",
    url: normalizedUrlString,
    normalizedUrl,
    domain: url.hostname,
    path: url.pathname,
    gitProvider,
    gitOwner: owner,
    gitRepo: repoName,
    gitRef
  };
}

var __defProp$3 = Object.defineProperty;
var __defNormalProp$3 = (obj, key, value) => key in obj ? __defProp$3(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$3 = (obj, key, value) => __defNormalProp$3(obj, typeof key !== "symbol" ? key + "" : key, value);
class TarStreamParser {
  constructor() {
    __publicField$3(this, "buffer", new Uint8Array(0));
    __publicField$3(this, "position", 0);
  }
  async *parse(stream) {
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const newBuffer = new Uint8Array(this.buffer.length + value.length);
        newBuffer.set(this.buffer);
        newBuffer.set(value, this.buffer.length);
        this.buffer = newBuffer;
        while (this.buffer.length >= 512) {
          const block = this.buffer.slice(0, 512);
          if (this.isEmptyBlock(block)) {
            this.buffer = this.buffer.slice(512);
            continue;
          }
          const header = this.parseHeader(block);
          if (!header) {
            this.buffer = this.buffer.slice(512);
            continue;
          }
          const paddedSize = Math.ceil(header.size / 512) * 512;
          const totalSize = 512 + paddedSize;
          if (this.buffer.length < totalSize) {
            break;
          }
          const body = this.buffer.slice(512, 512 + header.size);
          if (header.type === "0" || header.type === "") {
            yield { header, body };
          }
          this.buffer = this.buffer.slice(totalSize);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  isEmptyBlock(block) {
    return block.every((byte) => byte === 0);
  }
  parseHeader(block) {
    const name = this.readString(block, 0, 100);
    if (!name) return null;
    const sizeStr = this.readString(block, 124, 12);
    const size = Number.parseInt(sizeStr, 8);
    const typeFlag = String.fromCodePoint(block[156]);
    return {
      name: name.replace(/\0+$/, ""),
      // Remove null padding
      size,
      type: typeFlag
    };
  }
  readString(block, offset, length) {
    const bytes = block.slice(offset, offset + length);
    const nullIndex = bytes.indexOf(0);
    const effectiveLength = nullIndex === -1 ? length : nullIndex;
    return new TextDecoder().decode(bytes.slice(0, effectiveLength));
  }
}
async function* streamGitHubFiles(owner, repo, ref = "HEAD", options = {}) {
  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/${ref}`;
  const headers = {
    Accept: "application/vnd.github.v3.tarball",
    "User-Agent": "codefetch-worker"
  };
  if (options.token) {
    headers["Authorization"] = `token ${options.token}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository not found: ${owner}/${repo}`);
    } else if (response.status === 403) {
      throw new Error("API rate limit exceeded or authentication required");
    }
    throw new Error(
      `Failed to fetch tarball: ${response.status} ${response.statusText}`
    );
  }
  if (!response.body) {
    throw new Error("No response body");
  }
  const decompressedStream = response.body.pipeThrough(
    new DecompressionStream("gzip")
  );
  const parser = new TarStreamParser();
  const defaultExcludeDirs = [
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage"
  ];
  const excludeDirs = [...options.excludeDirs || [], ...defaultExcludeDirs];
  let processed = 0;
  let rootPrefix = "";
  for await (const { header, body } of parser.parse(decompressedStream)) {
    if (!rootPrefix && header.name.includes("/")) {
      rootPrefix = header.name.split("/")[0] + "/";
    }
    const relativePath = header.name.startsWith(rootPrefix) ? header.name.slice(rootPrefix.length) : header.name;
    if (!relativePath) continue;
    const pathParts = relativePath.split("/");
    const isExcluded = excludeDirs.some((dir) => pathParts.includes(dir));
    if (isExcluded) continue;
    if (options.extensions && options.extensions.length > 0) {
      const hasValidExt = options.extensions.some(
        (ext) => relativePath.endsWith(ext)
      );
      if (!hasValidExt) continue;
    }
    if (options.maxFiles && processed >= options.maxFiles) {
      break;
    }
    const content = new TextDecoder().decode(body);
    yield {
      path: relativePath,
      content
    };
    processed++;
    if (options.onProgress) {
      options.onProgress(processed);
    }
  }
}
async function fetchGitHubTarball(owner, repo, ref = "HEAD", options = {}) {
  const files = [];
  for await (const file of streamGitHubFiles(owner, repo, ref, options)) {
    files.push(file);
  }
  return files;
}

function createHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.codePointAt(i) || 0;
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

var __defProp$2 = Object.defineProperty;
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$2 = (obj, key, value) => __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
class CloudflareCache {
  constructor(options = {}) {
    __publicField$2(this, "options");
    __publicField$2(this, "cacheInstance");
    this.options = {
      namespace: "codefetch",
      ttl: 3600,
      // 1 hour default
      baseUrl: "https://cache.codefetch.workers.dev",
      // Default base URL
      ...options
    };
    this.cacheInstance = globalThis.caches?.default || caches.default;
  }
  /**
   * Generate a valid cache URL from a key
   */
  getCacheUrl(key) {
    const baseUrl = this.options.baseUrl || "https://cache.codefetch.workers.dev";
    const keyHash = createHash(key);
    return `${baseUrl}/cache/${this.options.namespace}/${encodeURIComponent(keyHash)}`;
  }
  async get(key) {
    try {
      const cacheUrl = this.getCacheUrl(key);
      const request = new Request(cacheUrl);
      const response = await this.cacheInstance.match(request);
      if (!response) {
        return null;
      }
      const ageHeader = response.headers.get("age");
      const maxAge = this.options.ttl || 3600;
      if (ageHeader && Number.parseInt(ageHeader, 10) > maxAge) {
        await this.delete(key);
        return null;
      }
      const data = await response.json();
      if (data.metadata?.expiresAt) {
        const expiresAt = new Date(data.metadata.expiresAt);
        if (expiresAt <= /* @__PURE__ */ new Date()) {
          await this.delete(key);
          return null;
        }
      }
      return data;
    } catch (error) {
      console.warn("CloudflareCache.get failed:", error);
      return null;
    }
  }
  async set(key, value, ttl) {
    try {
      const cacheUrl = this.getCacheUrl(key);
      const request = new Request(cacheUrl);
      const effectiveTtl = ttl || this.options.ttl || 3600;
      const now = /* @__PURE__ */ new Date();
      const expiresAt = new Date(now.getTime() + effectiveTtl * 1e3);
      const metadata = {
        url: key,
        fetchedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        contentType: "application/json"
      };
      const cachedResult = {
        metadata,
        content: value,
        type: "serialized"
      };
      const response = new Response(JSON.stringify(cachedResult), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${effectiveTtl}`,
          Expires: expiresAt.toUTCString()
        }
      });
      await this.cacheInstance.put(request, response);
    } catch (error) {
      console.warn("CloudflareCache.set failed:", error);
    }
  }
  async delete(key) {
    try {
      const cacheUrl = this.getCacheUrl(key);
      const request = new Request(cacheUrl);
      await this.cacheInstance.delete(request);
    } catch (error) {
      console.warn("CloudflareCache.delete failed:", error);
    }
  }
  async clear() {
    console.warn(
      "CloudflareCache.clear() is not supported. Cache entries will expire based on TTL."
    );
  }
  async has(key) {
    try {
      const cacheUrl = this.getCacheUrl(key);
      const request = new Request(cacheUrl);
      const response = await this.cacheInstance.match(request);
      if (!response) {
        return false;
      }
      const cached = await this.get(key);
      return cached !== null;
    } catch (error) {
      console.warn("CloudflareCache.has failed:", error);
      return false;
    }
  }
}

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
class MemoryCache {
  constructor(options = {}) {
    __publicField$1(this, "cache", /* @__PURE__ */ new Map());
    __publicField$1(this, "options");
    this.options = {
      namespace: "codefetch",
      ttl: 3600,
      // 1 hour default
      maxSize: 50 * 1024 * 1024,
      // 50MB default for memory
      ...options
    };
  }
  async get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expires <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  async set(key, value, ttl) {
    const effectiveTtl = ttl || this.options.ttl || 3600;
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + effectiveTtl * 1e3);
    const cachedResult = {
      metadata: {
        url: key,
        fetchedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        contentType: "application/json"
      },
      content: value,
      type: "memory"
    };
    this.cache.set(key, {
      data: cachedResult,
      expires: expiresAt.getTime()
    });
    this.cleanupExpired();
    this.cleanupIfNeeded();
  }
  async delete(key) {
    this.cache.delete(key);
  }
  async clear() {
    this.cache.clear();
  }
  async has(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (entry.expires <= Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  /**
   * Clean up expired entries
   */
  cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires <= now) {
        this.cache.delete(key);
      }
    }
  }
  /**
   * Estimate memory usage and clean if needed
   */
  cleanupIfNeeded() {
    const maxEntries = Math.floor(
      (this.options.maxSize || 5e7) / 10240
    );
    if (this.cache.size > maxEntries) {
      const entries = [...this.cache.entries()].sort(
        (a, b) => a[1].expires - b[1].expires
      );
      const entriesToRemove = Math.floor(entries.length * 0.2);
      for (let i = 0; i < entriesToRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }
}

const isCloudflareWorker = globalThis.WebSocketPair !== void 0 && !("__dirname" in globalThis);

async function createCache(options) {
  if (typeof caches !== "undefined" && globalThis.caches?.default) {
    return new CloudflareCache(options);
  }
  if (typeof process !== "undefined" && process.versions?.node && !isCloudflareWorker) {
    const { FileSystemCache } = await Promise.resolve().then(function () { return filesystemCache; });
    return new FileSystemCache(options);
  }
  return new MemoryCache(options);
}

function generateCacheKey(source, options = {}) {
  const parts = [source];
  if (options.extensions?.length > 0) {
    parts.push(`ext:${options.extensions.sort().join(",")}`);
  }
  if (options.excludeDirs?.length > 0) {
    parts.push(`exclude:${options.excludeDirs.sort().join(",")}`);
  }
  if (options.branch) {
    parts.push(`branch:${options.branch}`);
  }
  if (options.maxTokens) {
    parts.push(`tokens:${options.maxTokens}`);
  }
  return parts.join("|");
}
async function validateCachedContent(entry) {
  if (!entry || typeof entry !== "object") {
    return false;
  }
  if (!entry.content || !entry.metadata?.timestamp) {
    return false;
  }
  if (entry.metadata.ttl && entry.metadata.timestamp) {
    const now = Date.now();
    const age = now - entry.metadata.timestamp;
    if (age > entry.metadata.ttl * 1e3) {
      return false;
    }
  }
  return true;
}
const createLogger = (verbose) => ({
  info: (msg) => verbose && verbose >= 1 && console.log(`[INFO] ${msg}`),
  debug: (msg) => verbose && verbose >= 2 && console.log(`[DEBUG] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`)
});
async function fetchFromWebWorker(url, options = {}) {
  const logger = createLogger(options.verbose);
  const validation = validateURL(url);
  if (!validation.valid) {
    throw new Error(`Invalid URL: ${validation.error}`);
  }
  const parsedUrl = parseURL(url);
  if (!parsedUrl) {
    throw new Error("Failed to parse URL");
  }
  logger.info(`Fetching from: ${parsedUrl.url}`);
  let cache = null;
  if (!options.noCache && options.cache !== "bypass") {
    try {
      cache = await createCache({
        namespace: options.cacheNamespace || "codefetch",
        baseUrl: options.cacheBaseUrl || "https://cache.codefetch.workers.dev",
        ttl: options.cacheTTL || 3600
      });
    } catch (error) {
      logger.warn(`Failed to initialize cache: ${error}`);
    }
  }
  const cacheKey = options.cacheKey || generateCacheKey(url, options);
  let files = [];
  let fromCache = false;
  if (cache && options.cache !== "refresh") {
    try {
      const cached = await cache.get(cacheKey);
      if (cached && await validateCachedContent(cached)) {
        logger.info("Using cached content");
        if (typeof cached.content === "string") {
          files = JSON.parse(cached.content);
        } else if (Array.isArray(cached.content)) {
          files = cached.content;
        }
        fromCache = true;
      } else if (cached) {
        await cache.delete(cacheKey);
        logger.debug("Cached content invalid, fetching fresh");
      }
    } catch (error) {
      logger.warn(`Cache retrieval failed: ${error}`);
    }
  }
  if (!fromCache) {
    if (parsedUrl.gitProvider === "github") {
      files = await fetchGitHubStreaming(parsedUrl, logger, options);
    } else {
      throw new Error(
        "Only GitHub repositories are supported in Cloudflare Workers. Please use a GitHub URL (e.g., https://github.com/owner/repo)"
      );
    }
    if (cache && files.length > 0 && options.cache !== "bypass") {
      try {
        await cache.set(cacheKey, JSON.stringify(files), options.cacheTTL);
      } catch (error) {
        logger.warn(`Cache storage failed: ${error}`);
      }
    }
  }
  logger.info(`Analyzing ${files.length} files...`);
  if (options.format === "json") {
    const root = await buildTreeFromFiles(files, {
      tokenEncoder: options.tokenEncoder,
      tokenLimit: options.maxTokens
    });
    const metadata = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.content.length, 0),
      totalTokens: root.totalTokens || 0,
      fetchedAt: /* @__PURE__ */ new Date(),
      source: parsedUrl.url,
      gitProvider: parsedUrl.gitProvider,
      gitOwner: parsedUrl.gitOwner,
      gitRepo: parsedUrl.gitRepo,
      gitRef: parsedUrl.gitRef || options.branch || "main"
    };
    return new FetchResultImpl(root.node, metadata);
  } else {
    const markdown = await generateMarkdownFromContent(files, {
      maxTokens: options.maxTokens,
      includeTreeStructure: options.projectTree !== 0,
      tokenEncoder: options.tokenEncoder || "cl100k",
      disableLineNumbers: options.disableLineNumbers
    });
    return markdown;
  }
}
async function fetchGitHubStreaming(parsedUrl, logger, options) {
  if (!parsedUrl.gitOwner || !parsedUrl.gitRepo) {
    throw new Error("Invalid GitHub URL - missing owner or repo");
  }
  const branch = options.branch || parsedUrl.gitRef || "main";
  logger.info(
    `Streaming repository ${parsedUrl.gitOwner}/${parsedUrl.gitRepo}@${branch}...`
  );
  const files = await fetchGitHubTarball(
    parsedUrl.gitOwner,
    parsedUrl.gitRepo,
    branch,
    {
      token: options.githubToken || globalThis.GITHUB_TOKEN,
      extensions: options.extensions,
      excludeDirs: options.excludeDirs,
      maxFiles: options.maxFiles || 1e3,
      onProgress: (count) => {
        if (count % 50 === 0) {
          logger.info(`Processed ${count} files...`);
        }
      }
    }
  );
  logger.success(`Streamed ${files.length} files from GitHub`);
  return files;
}
async function buildTreeFromFiles(files, options) {
  const root = {
    name: "",
    path: "",
    type: "directory",
    children: []
  };
  let totalTokens = 0;
  files.sort((a, b) => a.path.localeCompare(b.path));
  for (const file of files) {
    const pathParts = file.path.split("/");
    let currentNode = root;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const dirName = pathParts[i];
      if (!currentNode.children) {
        currentNode.children = [];
      }
      let dirNode = currentNode.children.find(
        (child) => child.type === "directory" && child.name === dirName
      );
      if (!dirNode) {
        dirNode = {
          name: dirName,
          path: pathParts.slice(0, i + 1).join("/"),
          type: "directory",
          children: []
        };
        currentNode.children.push(dirNode);
      }
      currentNode = dirNode;
    }
    const fileName = pathParts.at(-1) || "";
    const tokens = await countTokens(
      file.content,
      options.tokenEncoder || "simple"
    );
    const fileNode = {
      name: fileName,
      path: file.path,
      type: "file",
      content: file.content,
      language: detectLanguage(fileName),
      size: file.content.length,
      tokens
    };
    if (!currentNode.children) {
      currentNode.children = [];
    }
    currentNode.children.push(fileNode);
    totalTokens += tokens;
  }
  sortTreeChildren(root);
  return { node: root, totalTokens };
}
function sortTreeChildren(node) {
  if (node.children) {
    node.children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    for (const child of node.children) {
      if (child.type === "directory") {
        sortTreeChildren(child);
      }
    }
  }
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class FileSystemCache {
  constructor(options = {}) {
    __publicField(this, "cacheDir");
    __publicField(this, "options");
    this.options = {
      namespace: "codefetch",
      ttl: 3600,
      // 1 hour default
      maxSize: 100 * 1024 * 1024,
      // 100MB default
      ...options
    };
    this.cacheDir = join(
      tmpdir(),
      `.codefetch-cache`,
      this.options.namespace || "codefetch"
    );
  }
  /**
   * Initialize cache directory
   */
  async ensureCacheDir() {
    await mkdir(this.cacheDir, { recursive: true });
  }
  /**
   * Get cache file path for a key
   */
  getCachePath(key) {
    const keyHash = createHash(key);
    return join(this.cacheDir, `${keyHash}.json`);
  }
  async get(key) {
    try {
      const cachePath = this.getCachePath(key);
      const content = await readFile(cachePath, "utf8");
      const cached = JSON.parse(content);
      if (cached.metadata?.expiresAt) {
        const expiresAt = new Date(cached.metadata.expiresAt);
        if (expiresAt <= /* @__PURE__ */ new Date()) {
          await this.delete(key);
          return null;
        }
      }
      if (cached.type === "filesystem" && cached.content?.path) {
        try {
          await stat(cached.content.path);
        } catch {
          await this.delete(key);
          return null;
        }
      }
      return cached;
    } catch {
      return null;
    }
  }
  async set(key, value, ttl) {
    try {
      await this.ensureCacheDir();
      const effectiveTtl = ttl || this.options.ttl || 3600;
      const now = /* @__PURE__ */ new Date();
      const expiresAt = new Date(now.getTime() + effectiveTtl * 1e3);
      const metadata = {
        url: key,
        fetchedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        contentType: "application/json"
      };
      const cachedResult = {
        metadata,
        content: value,
        type: typeof value === "string" && value.startsWith("/") ? "filesystem" : "serialized"
      };
      const cachePath = this.getCachePath(key);
      await writeFile(cachePath, JSON.stringify(cachedResult, null, 2));
      await this.cleanupIfNeeded();
    } catch (error) {
      console.warn("FileSystemCache.set failed:", error);
    }
  }
  async delete(key) {
    try {
      const cachePath = this.getCachePath(key);
      await rm(cachePath, { force: true });
    } catch {
    }
  }
  async clear() {
    try {
      await rm(this.cacheDir, { recursive: true, force: true });
    } catch {
    }
  }
  async has(key) {
    try {
      const cachePath = this.getCachePath(key);
      await stat(cachePath);
      const cached = await this.get(key);
      return cached !== null;
    } catch {
      return false;
    }
  }
  /**
   * Get total cache size in bytes
   */
  async getCacheSize() {
    let totalSize = 0;
    try {
      const files = await readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = join(this.cacheDir, file);
          const stats = await stat(filePath);
          totalSize += stats.size;
        }
      }
    } catch {
    }
    return totalSize;
  }
  /**
   * Cleanup cache if it exceeds size limit
   */
  async cleanupIfNeeded() {
    const maxSize = this.options.maxSize || 100 * 1024 * 1024;
    const currentSize = await this.getCacheSize();
    if (currentSize > maxSize) {
      try {
        const files = await readdir(this.cacheDir);
        const fileStats = [];
        for (const file of files) {
          if (file.endsWith(".json")) {
            const filePath = join(this.cacheDir, file);
            const stats = await stat(filePath);
            fileStats.push({
              path: filePath,
              atime: stats.atime,
              size: stats.size
            });
          }
        }
        fileStats.sort((a, b) => a.atime.getTime() - b.atime.getTime());
        let removedSize = 0;
        const targetSize = maxSize * 0.8;
        for (const file of fileStats) {
          if (currentSize - removedSize <= targetSize) {
            break;
          }
          await rm(file.path, { force: true });
          removedSize += file.size;
        }
      } catch (error) {
        console.warn("Cache cleanup failed:", error);
      }
    }
  }
}

const filesystemCache = {
  __proto__: null,
  FileSystemCache: FileSystemCache
};

export { FetchResultImpl, SUPPORTED_MODELS, VALID_ENCODERS, VALID_LIMITERS, VALID_PROMPTS, codegenPrompt, countTokens, detectLanguage, fetchFromWebWorker as fetch, fixPrompt, generateMarkdownFromContent, improvePrompt, prompts, testgenPrompt };
