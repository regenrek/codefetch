import { Tiktoken } from 'js-tiktoken/lite';

function getDefaultConfig() {
  return {
    format: "markdown",
    extensions: [],
    excludeFiles: [],
    includeFiles: [],
    excludeDirs: [],
    includeDirs: [],
    verbose: 0,
    projectTree: 0,
    dryRun: false,
    maxTokens: 5e4,
    tokenEncoder: "cl100k",
    disableLineNumbers: false,
    defaultIgnore: true,
    gitignore: false,
    // No file system access in Workers
    tokenLimiter: "truncated",
    tokenCountOnly: false,
    templateVars: {}
  };
}
async function resolveCodefetchConfig(cwd, overrides) {
  const defaults = getDefaultConfig();
  return {
    ...defaults,
    ...overrides
  };
}
function mergeWithCliArgs(config, args) {
  const merged = { ...config };
  if (args.format !== void 0) merged.format = args.format;
  if (args.extensions !== void 0) merged.extensions = args.extensions;
  if (args.excludeFiles !== void 0) merged.excludeFiles = args.excludeFiles;
  if (args.includeFiles !== void 0) merged.includeFiles = args.includeFiles;
  if (args.excludeDirs !== void 0) merged.excludeDirs = args.excludeDirs;
  if (args.includeDirs !== void 0) merged.includeDirs = args.includeDirs;
  if (args.verbose !== void 0) merged.verbose = args.verbose;
  if (args.projectTree !== void 0) merged.projectTree = args.projectTree;
  if (args.dryRun !== void 0) merged.dryRun = args.dryRun;
  if (args.maxTokens !== void 0) merged.maxTokens = args.maxTokens;
  if (args.tokenEncoder !== void 0) merged.tokenEncoder = args.tokenEncoder;
  if (args.disableLineNumbers !== void 0)
    merged.disableLineNumbers = args.disableLineNumbers;
  if (args.defaultIgnore !== void 0)
    merged.defaultIgnore = args.defaultIgnore;
  if (args.tokenLimiter !== void 0) merged.tokenLimiter = args.tokenLimiter;
  if (args.tokenCountOnly !== void 0)
    merged.tokenCountOnly = args.tokenCountOnly;
  if (args.promptFile !== void 0) merged.promptFile = args.promptFile;
  if (args.prompt !== void 0) merged.prompt = args.prompt;
  if (args.templateVars) {
    merged.templateVars = {
      ...merged.templateVars,
      ...args.templateVars
    };
  }
  return merged;
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

const VALID_PROMPTS = /* @__PURE__ */ new Set([
  "default",
  "fix",
  "improve",
  "testgen",
  "codegen"
]);
const VALID_ENCODERS = /* @__PURE__ */ new Set(["simple", "p50k", "o200k", "cl100k"]);
const VALID_LIMITERS = /* @__PURE__ */ new Set(["sequential", "truncated"]);

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

function isIPv4(str) {
  const parts = str.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const num = Number.parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
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
function extractCacheKey(parsedUrl) {
  const ref = parsedUrl.gitRef || "default";
  return `${parsedUrl.gitProvider}-${parsedUrl.gitOwner}-${parsedUrl.gitRepo}-${ref}`;
}

class WorkerWebCache {
  ttlHours;
  cachePrefix = "codefetch-v1";
  constructor(options) {
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

class TarStreamParser {
  buffer = new Uint8Array(0);
  position = 0;
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
    const typeFlag = String.fromCharCode(block[156]);
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
async function streamGitHubTarball(owner, repo, ref = "HEAD", options = {}) {
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
  const files = [];
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
    files.push({
      path: relativePath,
      content
    });
    processed++;
    if (options.onProgress) {
      options.onProgress(processed);
    }
  }
  return files;
}

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
      files = await fetchGitHubStreaming(parsedUrl, logger, options);
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
async function fetchGitHubStreaming(parsedUrl, logger, options) {
  if (!parsedUrl.gitOwner || !parsedUrl.gitRepo) {
    throw new Error("Invalid GitHub URL - missing owner or repo");
  }
  const branch = options.branch || parsedUrl.gitRef || "main";
  logger.info(
    `Streaming repository ${parsedUrl.gitOwner}/${parsedUrl.gitRepo}@${branch}...`
  );
  const files = await streamGitHubTarball(
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

function htmlToMarkdown(html, options = {}) {
  const {
    includeUrls = true,
    preserveWhitespace = false,
    customReplacements = []
  } = options;
  let markdown = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  for (const { pattern, replacement } of customReplacements) {
    markdown = markdown.replace(pattern, replacement);
  }
  markdown = markdown.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n");
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n");
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
  markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gis, (match, content) => {
    const cleanContent = content.replace(/<[^>]+>/g, "").replace(/^\n+|\n+$/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    return "\n```\n" + cleanContent + "\n```\n\n";
  });
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
    const items = content.match(/<li[^>]*>(.*?)<\/li>/gis) || [];
    return "\n" + items.map((item) => {
      const text = item.replace(/<\/?li[^>]*>/gi, "").trim();
      return "- " + text;
    }).join("\n") + "\n\n";
  });
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
    const items = content.match(/<li[^>]*>(.*?)<\/li>/gis) || [];
    return "\n" + items.map((item, index) => {
      const text = item.replace(/<\/?li[^>]*>/gi, "").trim();
      return `${index + 1}. ${text}`;
    }).join("\n") + "\n\n";
  });
  markdown = includeUrls ? markdown.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)") : markdown.replace(/<a[^>]+href="[^"]*"[^>]*>(.*?)<\/a>/gi, "$1");
  markdown = markdown.replace(
    /<img[^>]+alt="([^"]*)"[^>]+src="([^"]*)"[^>]*>/gi,
    "![$1]($2)"
  );
  markdown = markdown.replace(
    /<img[^>]+src="([^"]*)"[^>]+alt="([^"]*)"[^>]*>/gi,
    "![$2]($1)"
  );
  markdown = markdown.replace(/<img[^>]+src="([^"]*)"[^>]*>/gi, "![]($1)");
  markdown = markdown.replace(
    /<blockquote[^>]*>(.*?)<\/blockquote>/gis,
    (match, content) => {
      const lines = content.trim().split("\n");
      return "\n" + lines.map((line) => "> " + line.trim()).join("\n") + "\n\n";
    }
  );
  markdown = markdown.replace(/<hr[^>]*>/gi, "\n---\n\n");
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gis, "$1\n\n");
  markdown = markdown.replace(/<br[^>]*>/gi, "\n");
  markdown = markdown.replace(/<[^>]+>/g, "");
  if (!preserveWhitespace) {
    markdown = markdown.replace(/\r\n/g, "\n");
    markdown = markdown.replace(/\n{3,}/g, "\n\n");
    markdown = markdown.trim();
  }
  return markdown;
}

var codegen_default = `You are a senior developer. You produce optimized, maintainable code that follows best practices. 

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

var fix_default = `You are a senior developer. You produce optimized, maintainable code that follows best practices. 

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

var improve_default = `You are a senior software architect. You produce optimized, maintainable code that follows best practices. 

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

var testgen_default = `You are a senior test developer. You produce optimized, maintainable code that follows best practices. 

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
  codegen: codegen_default,
  fix: fix_default,
  improve: improve_default,
  testgen: testgen_default
};

export { FetchResultImpl, VALID_ENCODERS, VALID_LIMITERS, VALID_PROMPTS, codegen_default as codegenPrompt, countTokens, fetchFromWebWorker as fetchFromWeb, fix_default as fixPrompt, generateMarkdownFromContent, getCacheSizeLimit, getDefaultConfig, htmlToMarkdown, improve_default as improvePrompt, isCloudflareWorker, mergeWithCliArgs, prompts, resolveCodefetchConfig, streamGitHubTarball, testgen_default as testgenPrompt };
