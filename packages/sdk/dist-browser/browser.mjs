import { Tiktoken } from 'js-tiktoken/lite';
import { URL } from 'node:url';
import { isIPv4, isIPv6 } from 'node:net';
import { join } from 'node:path';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import AdmZip from 'adm-zip';

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
function extractCacheKey(parsedUrl) {
  const ref = parsedUrl.gitRef || "default";
  return `${parsedUrl.gitProvider}-${parsedUrl.gitOwner}-${parsedUrl.gitRepo}-${ref}`;
}

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
class WorkerWebCache {
  constructor(options) {
    __publicField$1(this, "ttlHours");
    __publicField$1(this, "cachePrefix", "codefetch-v1");
    this.ttlHours = options?.ttlHours ?? 1;
  }
  /**
   * Generate cache key for a parsed URL using Web Crypto API
   */
  async getCacheKey(parsedUrl) {
    const key = extractCacheKey(parsedUrl);
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = [...new Uint8Array(hashBuffer)];
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    const shortHash = hashHex.slice(0, 8);
    return `${this.cachePrefix}:${parsedUrl.type}:${key}-${shortHash}`;
  }
  /**
   * Initialize cache (no-op for Workers)
   */
  async init() {
  }
  /**
   * Check if cache entry exists and is valid
   */
  async has(parsedUrl) {
    const cache = await caches.open(this.cachePrefix);
    const cacheKey = await this.getCacheKey(parsedUrl);
    const response = await cache.match(cacheKey);
    if (!response) return false;
    const expiresHeader = response.headers.get("expires");
    if (expiresHeader) {
      const expiresAt = new Date(expiresHeader);
      if (expiresAt <= /* @__PURE__ */ new Date()) {
        await cache.delete(cacheKey);
        return false;
      }
    }
    return true;
  }
  /**
   * Get cached content
   */
  async get(parsedUrl) {
    const cache = await caches.open(this.cachePrefix);
    const cacheKey = await this.getCacheKey(parsedUrl);
    const response = await cache.match(cacheKey);
    if (!response) return null;
    const expiresHeader = response.headers.get("expires");
    if (expiresHeader) {
      const expiresAt = new Date(expiresHeader);
      if (expiresAt <= /* @__PURE__ */ new Date()) {
        await cache.delete(cacheKey);
        return null;
      }
    }
    try {
      const data = await response.json();
      return data;
    } catch {
      await cache.delete(cacheKey);
      return null;
    }
  }
  /**
   * Store content in cache
   */
  async set(parsedUrl, content, options) {
    const cache = await caches.open(this.cachePrefix);
    const cacheKey = await this.getCacheKey(parsedUrl);
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + this.ttlHours * 60 * 60 * 1e3);
    const metadata = {
      url: parsedUrl.url,
      fetchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      contentType: options?.contentType,
      headers: options?.headers
    };
    const cacheEntry = {
      metadata,
      content: content.toString()
    };
    const response = new Response(JSON.stringify(cacheEntry), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${this.ttlHours * 3600}`,
        Expires: expiresAt.toUTCString()
      }
    });
    await cache.put(cacheKey, response);
  }
  /**
   * Delete cache entry
   */
  async delete(parsedUrl) {
    const cache = await caches.open(this.cachePrefix);
    const cacheKey = await this.getCacheKey(parsedUrl);
    await cache.delete(cacheKey);
  }
  /**
   * Clear entire cache
   */
  async clear() {
    console.warn("Cache clear not fully supported in Workers");
  }
  /**
   * Get cache statistics (limited in Workers)
   */
  async getStats() {
    return {
      sizeMB: 0,
      entryCount: 0,
      websiteCount: 0,
      repoCount: 0
    };
  }
}

const isCloudflareWorker = globalThis.WebSocketPair !== void 0 && !("__dirname" in globalThis);
const getCacheSizeLimit = () => {
  if (isCloudflareWorker) {
    return 8 * 1024 * 1024;
  }
  return 100 * 1024 * 1024;
};

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class GitHubApiClient {
  constructor(owner, repo, logger, options = {}) {
    this.owner = owner;
    this.repo = repo;
    this.logger = logger;
    this.options = options;
    __publicField(this, "baseUrl", "https://api.github.com");
    __publicField(this, "headers");
    this.headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Codefetch/1.0"
    };
    if (options.token) {
      this.headers.Authorization = `token ${options.token}`;
    }
  }
  /**
   * Check if the repository is accessible via API
   */
  async checkAccess() {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${this.owner}/${this.repo}`,
        { headers: this.headers }
      );
      if (!response.ok) {
        if (response.status === 404) {
          return { accessible: false, isPrivate: true, defaultBranch: "main" };
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }
      const data = await response.json();
      return {
        accessible: true,
        isPrivate: data.private,
        defaultBranch: data.default_branch
      };
    } catch (error) {
      this.logger.debug(`Failed to check repository access: ${error}`);
      return { accessible: false, isPrivate: true, defaultBranch: "main" };
    }
  }
  /**
   * Download repository as ZIP archive
   */
  async downloadZipArchive(ref = "HEAD") {
    const branch = this.options.branch || ref;
    const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/zipball/${branch}`;
    this.logger.info(`Downloading repository archive...`);
    const response = await fetch(url, {
      headers: this.headers,
      redirect: "follow"
    });
    if (!response.ok) {
      throw new Error(
        `Failed to download archive: ${response.status} ${response.statusText}`
      );
    }
    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const sizeBytes = Number.parseInt(contentLength);
      const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
      this.logger.info(`Archive size: ${sizeMB} MB`);
      if (isCloudflareWorker && sizeBytes > getCacheSizeLimit()) {
        throw new Error(
          `Archive size (${sizeMB} MB) exceeds Worker storage limit (${getCacheSizeLimit() / 1024 / 1024} MB). Please use a smaller repository or filter files more aggressively.`
        );
      }
    } else {
      this.logger.warn(
        "GitHub API did not provide Content-Length header. Archive size cannot be determined in advance."
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  /**
   * Download and extract repository to a directory
   */
  async downloadToDirectory(targetDir, options = {}) {
    const zipBuffer = await this.downloadZipArchive(this.options.branch);
    const tempDir = await mkdtemp(join(tmpdir(), "codefetch-zip-"));
    const zipPath = join(tempDir, "repo.zip");
    await writeFile(zipPath, zipBuffer);
    this.logger.info("Extracting repository archive...");
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    let rootPrefix = "";
    if (entries.length > 0) {
      const firstEntry = entries[0].entryName;
      const match = firstEntry.match(/^[^/]+\//);
      if (match) {
        rootPrefix = match[0];
      }
    }
    await mkdir(targetDir, { recursive: true });
    let extracted = 0;
    let skipped = 0;
    const defaultExcludeDirs = [
      ".git",
      "node_modules",
      "dist",
      "build",
      ".next",
      "coverage"
    ];
    const excludeDirs = [...options.excludeDirs || [], ...defaultExcludeDirs];
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const relativePath = entry.entryName.startsWith(rootPrefix) ? entry.entryName.slice(rootPrefix.length) : entry.entryName;
      if (!relativePath) continue;
      const pathParts = relativePath.split("/");
      const isExcluded = excludeDirs.some((dir) => pathParts.includes(dir));
      if (isExcluded) {
        skipped++;
        continue;
      }
      if (options.extensions && options.extensions.length > 0) {
        const hasValidExt = options.extensions.some(
          (ext) => relativePath.endsWith(ext)
        );
        if (!hasValidExt) {
          skipped++;
          continue;
        }
      }
      if (options.maxFiles && extracted >= options.maxFiles) {
        this.logger.warn(
          `Reached file limit (${options.maxFiles}), stopping extraction`
        );
        break;
      }
      try {
        const targetPath = join(targetDir, relativePath);
        const targetDirPath = join(
          targetDir,
          relativePath.slice(0, Math.max(0, relativePath.lastIndexOf("/")))
        );
        await mkdir(targetDirPath, { recursive: true });
        const buffer = zip.readFile(entry);
        if (!buffer) {
          throw new Error("Failed to read file from ZIP");
        }
        await writeFile(targetPath, buffer);
        extracted++;
        if (extracted % 50 === 0) {
          this.logger.info(`Extracted ${extracted} files...`);
        }
      } catch (error) {
        this.logger.debug(`Failed to extract ${relativePath}: ${error}`);
        skipped++;
      }
    }
    await rm(tempDir, { recursive: true, force: true });
    this.logger.success(`Extracted ${extracted} files (skipped ${skipped})`);
  }
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
  let cachedContent = null;
  if (options.noCache) {
    logger.debug("Cache disabled");
  } else {
    if (isCloudflareWorker) {
      cache = new WorkerWebCache({
        ttlHours: options.cacheTTL || 1
      });
      await cache.init();
      const cached = await cache.get(parsedUrl);
      if (cached) {
        logger.info("Using cached content");
        cachedContent = JSON.parse(cached.content);
      }
    }
  }
  let files = [];
  if (cachedContent) {
    files = cachedContent;
  } else {
    if (parsedUrl.gitProvider === "github") {
      files = await fetchGitHubInMemory(parsedUrl, logger, options);
    } else {
      throw new Error(
        "Only GitHub repositories are supported in Cloudflare Workers. Please use a GitHub URL (e.g., https://github.com/owner/repo)"
      );
    }
    if (cache) {
      await cache.set(parsedUrl, JSON.stringify(files));
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
async function fetchGitHubInMemory(parsedUrl, logger, options) {
  if (!parsedUrl.gitOwner || !parsedUrl.gitRepo) {
    throw new Error("Invalid GitHub URL - missing owner or repo");
  }
  const client = new GitHubApiClient(
    parsedUrl.gitOwner,
    parsedUrl.gitRepo,
    logger,
    {
      token: options.githubToken || globalThis.GITHUB_TOKEN,
      branch: options.branch || parsedUrl.gitRef
    }
  );
  const { accessible, isPrivate, defaultBranch } = await client.checkAccess();
  if (!accessible) {
    throw new Error(
      "Repository not accessible. If it's a private repository, please provide a GitHub token via the githubToken option."
    );
  }
  if (isPrivate && !options.githubToken && !globalThis.GITHUB_TOKEN) {
    throw new Error(
      "Private repository requires authentication. Please provide a GitHub token via the githubToken option."
    );
  }
  logger.info("Fetching repository via GitHub API...");
  const branch = options.branch || parsedUrl.gitRef || defaultBranch;
  const zipBuffer = await client.downloadZipArchive(branch);
  logger.info("Extracting repository content...");
  const { default: AdmZip } = await import('adm-zip');
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const files = [];
  let rootPrefix = "";
  if (entries.length > 0) {
    const firstEntry = entries[0].entryName;
    const match = firstEntry.match(/^[^/]+\//);
    if (match) {
      rootPrefix = match[0];
    }
  }
  const defaultExcludeDirs = [
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage"
  ];
  const excludeDirs = [...options.excludeDirs || [], ...defaultExcludeDirs];
  let extracted = 0;
  let skipped = 0;
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const relativePath = entry.entryName.startsWith(rootPrefix) ? entry.entryName.slice(rootPrefix.length) : entry.entryName;
    if (!relativePath) continue;
    const pathParts = relativePath.split("/");
    const isExcluded = excludeDirs.some((dir) => pathParts.includes(dir));
    if (isExcluded) {
      skipped++;
      continue;
    }
    if (options.extensions && options.extensions.length > 0) {
      const hasValidExt = options.extensions.some(
        (ext) => relativePath.endsWith(ext)
      );
      if (!hasValidExt) {
        skipped++;
        continue;
      }
    }
    const maxFiles = options.maxFiles;
    if (maxFiles && extracted >= maxFiles) {
      logger.warn(`Reached file limit (${maxFiles}), stopping extraction`);
      break;
    }
    try {
      const buffer = zip.readFile(entry);
      if (!buffer) {
        throw new Error("Failed to read file from ZIP");
      }
      files.push({
        path: relativePath,
        content: buffer.toString("utf8")
      });
      extracted++;
      if (extracted % 50 === 0) {
        logger.info(`Extracted ${extracted} files...`);
      }
    } catch (error) {
      logger.debug(`Failed to extract ${relativePath}: ${error}`);
      skipped++;
    }
  }
  logger.success(`Extracted ${extracted} files (skipped ${skipped})`);
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

export { FetchResultImpl, SUPPORTED_MODELS, VALID_ENCODERS, VALID_LIMITERS, VALID_PROMPTS, codegenPrompt, countTokens, detectLanguage, fetchFromWebWorker as fetch, fixPrompt, generateMarkdownFromContent, improvePrompt, prompts, testgenPrompt };
