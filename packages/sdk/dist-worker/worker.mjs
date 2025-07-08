import path, { resolve, basename, join, relative } from 'pathe';
import 'defu';
import { Tiktoken } from 'js-tiktoken/lite';
import fs, { existsSync, createReadStream } from 'node:fs';
import { readFile, mkdir, stat, writeFile, rm, readdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join as join$1 } from 'node:path';
import { execSync } from 'node:child_process';
import ignore from 'ignore';
import { URL } from 'node:url';
import { isIPv4, isIPv6 } from 'node:net';
import { createHash } from 'node:crypto';
import AdmZip from 'adm-zip';
import fg from 'fast-glob';

const defaultOutput = "codebase.md";
const getDefaultConfig = () => ({
  outputPath: "codefetch",
  outputFile: defaultOutput,
  maxTokens: 999e3,
  // safety
  verbose: 1,
  projectTree: 2,
  defaultIgnore: true,
  gitignore: true,
  tokenEncoder: "simple",
  tokenLimiter: "truncated",
  trackedModels: ["o3", "gemini-2.5-pro", "claude-sonnet-4", "claude-opus-4"],
  dryRun: false,
  disableLineNumbers: false,
  tokenCountOnly: false,
  defaultPromptFile: "default.md",
  defaultChat: "https://chat.com",
  templateVars: {},
  format: "markdown"
});
async function resolveCodefetchConfig(config, cwd) {
  const resolved = { ...config };
  if (typeof resolved.outputPath === "string") {
    resolved.outputPath = resolve(cwd, resolved.outputPath);
  }
  if (resolved.includeFiles) {
    resolved.includeFiles = resolved.includeFiles.map(
      (pattern) => resolve(cwd, pattern)
    );
  }
  if (resolved.excludeFiles) {
    resolved.excludeFiles = resolved.excludeFiles.map(
      (pattern) => resolve(cwd, pattern)
    );
  }
  if (resolved.includeDirs) {
    resolved.includeDirs = resolved.includeDirs.map(
      (pattern) => resolve(cwd, pattern)
    );
  }
  if (resolved.excludeDirs) {
    resolved.excludeDirs = resolved.excludeDirs.map(
      (pattern) => resolve(cwd, pattern)
    );
  }
  return resolved;
}
function mergeWithCliArgs(config, cliArgs) {
  const mergeArrays = (a, b) => {
    if (!a && !b) return [];
    if (!a) return b || [];
    if (!b) return a;
    return [.../* @__PURE__ */ new Set([...a, ...b])];
  };
  return {
    ...config,
    ...cliArgs,
    includeFiles: mergeArrays(config.includeFiles, cliArgs.includeFiles),
    excludeFiles: mergeArrays(config.excludeFiles, cliArgs.excludeFiles),
    includeDirs: mergeArrays(config.includeDirs, cliArgs.includeDirs),
    excludeDirs: mergeArrays(config.excludeDirs, cliArgs.excludeDirs)
  };
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

function generateTree(dir, level, prefix = "", isLast = true, maxLevel = 2, currentLevel = 0) {
  if (currentLevel >= maxLevel) return "";
  let tree = currentLevel === 0 ? "" : `${prefix}${isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 "}${basename(dir)}
`;
  const files = fs.readdirSync(dir);
  const filteredFiles = files.filter(
    (file) => !file.startsWith(".") && file !== "node_modules"
  );
  for (const [index, file] of filteredFiles.entries()) {
    const filePath = join(dir, file);
    const isDirectory = fs.statSync(filePath).isDirectory();
    const newPrefix = currentLevel === 0 ? "" : prefix + (isLast ? "    " : "\u2502   ");
    const isLastItem = index === filteredFiles.length - 1;
    if (isDirectory) {
      tree += generateTree(
        filePath,
        level + 1,
        newPrefix,
        isLastItem,
        maxLevel,
        currentLevel + 1
      );
    } else if (currentLevel < maxLevel) {
      tree += `${newPrefix}${isLastItem ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 "}${file}
`;
    }
  }
  return tree;
}
function generateProjectTree(baseDir, maxLevel = 2) {
  return "Project Structure:\n" + generateTree(baseDir, 1, "", true, maxLevel, 0);
}

const builtInPrompts = {
  fix: () => Promise.resolve().then(function () { return fix; }),
  improve: () => Promise.resolve().then(function () { return improve; }),
  codegen: () => Promise.resolve().then(function () { return codegen; }),
  testgen: () => Promise.resolve().then(function () { return testgen; })
};
async function processPromptTemplate(template, codebase, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  result = result.replace(/{{CURRENT_CODEBASE}}/g, codebase);
  console.log("result", result);
  return result;
}
async function resolvePrompt(promptFile) {
  console.log("promptFile", promptFile);
  if (VALID_PROMPTS.has(promptFile)) {
    try {
      const mod = await builtInPrompts[promptFile]?.();
      return mod?.default;
    } catch {
      console.error(`Built-in prompt "${promptFile}" not found`);
      return "";
    }
  }
  if (promptFile.endsWith(".md") || promptFile.endsWith(".txt")) {
    const defaultPath = resolve(promptFile);
    if (!existsSync(defaultPath)) {
      return "";
    }
    return await readFile(defaultPath, "utf8");
  }
}

const CHUNK_SIZE = 64 * 1024;
async function readFileWithTokenLimit(file, tokenEncoder, remainingTokensRef, disableLineNumbers, onVerbose) {
  const initialTokens = remainingTokensRef.value;
  const stream = createReadStream(file, {
    encoding: "utf8",
    highWaterMark: CHUNK_SIZE
  });
  const outputLines = [];
  let buffer = "";
  let currentLineNo = 1;
  let isTruncated = false;
  const relativeFilePath = relative(process.cwd(), file);
  const metadataTokens = await countTokens(
    `${relativeFilePath}
\`\`\`
\`\`\`
`,
    tokenEncoder
  );
  const truncatedMarkerTokens = await countTokens(
    "[TRUNCATED]\n",
    tokenEncoder
  );
  remainingTokensRef.value -= metadataTokens;
  outputLines.push(relativeFilePath);
  outputLines.push("```");
  for await (const chunk of stream) {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const prefixedLine = disableLineNumbers ? line : `${currentLineNo} | ${line}`;
      const neededTokens = await countTokens(prefixedLine, tokenEncoder);
      if (neededTokens > remainingTokensRef.value - truncatedMarkerTokens) {
        isTruncated = true;
        break;
      }
      outputLines.push(prefixedLine);
      remainingTokensRef.value -= neededTokens;
      currentLineNo++;
    }
    if (isTruncated) break;
  }
  if (!isTruncated && buffer) {
    const prefixedLine = disableLineNumbers ? buffer : `${currentLineNo} | ${buffer}`;
    const neededTokens = await countTokens(prefixedLine, tokenEncoder);
    if (neededTokens <= remainingTokensRef.value - truncatedMarkerTokens) {
      outputLines.push(prefixedLine);
      remainingTokensRef.value -= neededTokens;
    } else {
      isTruncated = true;
    }
  }
  if (isTruncated) {
    outputLines.push("[TRUNCATED]");
    remainingTokensRef.value -= truncatedMarkerTokens;
  }
  outputLines.push("```\n");
  const tokensUsed = initialTokens - remainingTokensRef.value;
  onVerbose?.(
    `File ${file}: ${tokensUsed} tokens used, ${remainingTokensRef.value} remaining`,
    3
  );
  return { lines: outputLines, finalLineNumber: currentLineNo };
}
async function generateMarkdown(files, options) {
  const {
    maxTokens,
    verbose: _verbose = 0,
    projectTree = 0,
    tokenEncoder,
    disableLineNumbers = false,
    tokenLimiter = "truncated",
    promptFile,
    templateVars,
    onVerbose
  } = options;
  let promptTemplate = "";
  const markdownContent = [];
  const tokenCounter = {
    remaining: maxTokens ?? Number.MAX_SAFE_INTEGER,
    total: 0
  };
  if (promptFile) {
    onVerbose?.("Writing prompt template...", 2);
    const resolvedPrompt = await resolvePrompt(promptFile);
    if (resolvedPrompt) {
      promptTemplate = resolvedPrompt;
      const promptTokens = await countTokens(promptTemplate, tokenEncoder);
      if (maxTokens && promptTokens > tokenCounter.remaining) {
        onVerbose?.(`Prompt exceeds token limit, skipping`, 3);
        return "";
      }
      const templateTokens = await countTokens(promptTemplate, tokenEncoder);
      tokenCounter.remaining -= templateTokens;
      tokenCounter.total += templateTokens;
      onVerbose?.(`Token used for prompt: ${templateTokens}`, 3);
    } else {
      onVerbose?.(`No prompt template found, skipping`, 1);
    }
  }
  onVerbose?.(`Initial token limit: ${tokenCounter.remaining}`, 3);
  if (projectTree > 0) {
    onVerbose?.("Writing project tree...", 2);
    const tree = generateProjectTree(process.cwd(), projectTree);
    const treeTokens = await countTokens(tree, tokenEncoder);
    if (maxTokens && treeTokens > tokenCounter.remaining) {
      onVerbose?.(`Tree exceeds token limit, skipping`, 3);
      return "";
    }
    markdownContent.push(tree, "");
    tokenCounter.remaining -= treeTokens;
    tokenCounter.total += treeTokens;
    onVerbose?.(`Tokens used for tree: ${treeTokens}`, 3);
  }
  if (tokenLimiter === "truncated" && maxTokens) {
    const tokensPerFile = Math.floor(tokenCounter.remaining / files.length);
    onVerbose?.(`Distributing ${tokensPerFile} tokens per file`, 3);
    for (const file of files) {
      const { lines: fileLines } = await readFileWithTokenLimit(
        file,
        tokenEncoder,
        { value: tokensPerFile },
        disableLineNumbers,
        onVerbose
      );
      markdownContent.push(...fileLines);
      const fileTokens = await countTokens(fileLines.join("\n"), tokenEncoder);
      tokenCounter.total += fileTokens;
      tokenCounter.remaining = Math.max(0, tokenCounter.remaining - fileTokens);
    }
  } else {
    for (const file of files) {
      if (maxTokens && tokenCounter.total >= maxTokens) {
        onVerbose?.(
          `Total token limit reached (${tokenCounter.total}/${maxTokens})`,
          2
        );
        break;
      }
      const { lines: fileLines } = await readFileWithTokenLimit(
        file,
        tokenEncoder,
        {
          value: maxTokens ? maxTokens - tokenCounter.total : Number.MAX_SAFE_INTEGER
        },
        disableLineNumbers,
        onVerbose
      );
      const fileContent = fileLines.join("\n");
      const fileTokens = await countTokens(fileContent, tokenEncoder);
      if (maxTokens && tokenCounter.total + fileTokens > maxTokens) {
        onVerbose?.(
          `Adding file would exceed token limit, skipping: ${file}`,
          2
        );
        continue;
      }
      markdownContent.push(...fileLines);
      tokenCounter.total += fileTokens;
      tokenCounter.remaining = maxTokens ? maxTokens - tokenCounter.total : Number.MAX_SAFE_INTEGER;
    }
  }
  onVerbose?.(`Final token count: ${tokenCounter.total}`, 2);
  const content = markdownContent.join("\n");
  return !promptFile || promptTemplate === "" ? content : processPromptTemplate(promptTemplate, content, templateVars ?? {});
}

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

const isCloudflareWorker = globalThis.WebSocketPair !== void 0 && !("__dirname" in globalThis);
const getCacheSizeLimit = () => {
  if (isCloudflareWorker) {
    return 8 * 1024 * 1024;
  }
  return 100 * 1024 * 1024;
};

class WebCache {
  cacheDir;
  ttlHours;
  maxSizeMB;
  constructor(options) {
    this.cacheDir = options?.cacheDir || join$1(tmpdir(), ".codefetch-cache");
    this.ttlHours = options?.ttlHours ?? 1;
    const defaultMaxSize = getCacheSizeLimit() / (1024 * 1024);
    this.maxSizeMB = options?.maxSizeMB ?? defaultMaxSize;
  }
  /**
   * Initialize cache directory
   */
  async init() {
    await mkdir(this.cacheDir, { recursive: true });
    await mkdir(join$1(this.cacheDir, "websites"), { recursive: true });
    await mkdir(join$1(this.cacheDir, "repos"), { recursive: true });
    await this.cleanupIfNeeded();
  }
  /**
   * Get cache directory for a parsed URL
   */
  getCacheDir(parsedUrl) {
    const type = parsedUrl.type === "git-repository" ? "repos" : "websites";
    const key = extractCacheKey(parsedUrl);
    const hash = createHash("md5").update(key).digest("hex").slice(0, 8);
    return join$1(this.cacheDir, type, `${key}-${hash}`);
  }
  /**
   * Check if cache entry exists and is valid
   */
  async has(parsedUrl) {
    try {
      const dir = this.getCacheDir(parsedUrl);
      const metadataPath = join$1(dir, "metadata.json");
      const metadataContent = await readFile(metadataPath, "utf8");
      const metadata = JSON.parse(metadataContent);
      const expiresAt = new Date(metadata.expiresAt);
      return expiresAt > /* @__PURE__ */ new Date();
    } catch {
      return false;
    }
  }
  /**
   * Get cached content
   */
  async get(parsedUrl) {
    try {
      const dir = this.getCacheDir(parsedUrl);
      const metadataPath = join$1(dir, "metadata.json");
      const metadataContent = await readFile(metadataPath, "utf8");
      const metadata = JSON.parse(metadataContent);
      const expiresAt = new Date(metadata.expiresAt);
      if (expiresAt <= /* @__PURE__ */ new Date()) {
        await this.delete(parsedUrl);
        return null;
      }
      if (parsedUrl.type === "git-repository") {
        const content = await readFile(join$1(dir, "repo-path.txt"), "utf8");
        try {
          await stat(content);
        } catch {
          await this.delete(parsedUrl);
          return null;
        }
        return { metadata, content };
      }
      const contentPath = join$1(dir, "content");
      try {
        await stat(contentPath);
      } catch {
        await this.delete(parsedUrl);
        return null;
      }
      return {
        metadata,
        content: contentPath
      };
    } catch {
      return null;
    }
  }
  /**
   * Store content in cache
   */
  async set(parsedUrl, content, options) {
    const dir = this.getCacheDir(parsedUrl);
    await mkdir(dir, { recursive: true });
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + this.ttlHours * 60 * 60 * 1e3);
    const metadata = {
      url: parsedUrl.url,
      fetchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      contentType: options?.contentType,
      headers: options?.headers
    };
    await writeFile(
      join$1(dir, "metadata.json"),
      JSON.stringify(metadata, null, 2)
    );
    if (parsedUrl.type === "git-repository") {
      await writeFile(join$1(dir, "repo-path.txt"), content.toString());
    } else {
      const contentDir = join$1(dir, "content");
      await mkdir(contentDir, { recursive: true });
    }
  }
  /**
   * Delete cache entry
   */
  async delete(parsedUrl) {
    const dir = this.getCacheDir(parsedUrl);
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {
    }
  }
  /**
   * Clear entire cache
   */
  async clear() {
    try {
      await rm(this.cacheDir, { recursive: true, force: true });
      await this.init();
    } catch {
    }
  }
  /**
   * Get cache size in MB
   */
  async getCacheSize() {
    let totalSize = 0;
    async function getDirectorySize2(dir) {
      let size = 0;
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = join$1(dir, entry.name);
          if (entry.isDirectory()) {
            size += await getDirectorySize2(fullPath);
          } else {
            const stats = await stat(fullPath);
            size += stats.size;
          }
        }
      } catch {
      }
      return size;
    }
    totalSize = await getDirectorySize2(this.cacheDir);
    return totalSize / (1024 * 1024);
  }
  /**
   * Cleanup cache if it exceeds size limit
   */
  async cleanupIfNeeded() {
    const sizeMB = await this.getCacheSize();
    if (sizeMB > this.maxSizeMB) {
      const entries = [];
      for (const type of ["websites", "repos"]) {
        const typeDir = join$1(this.cacheDir, type);
        try {
          const dirs = await readdir(typeDir);
          for (const dir of dirs) {
            const fullDir = join$1(typeDir, dir);
            const metadataPath = join$1(fullDir, "metadata.json");
            try {
              const metadataContent = await readFile(metadataPath, "utf8");
              const metadata = JSON.parse(metadataContent);
              const stats = await stat(fullDir);
              entries.push({ dir: fullDir, metadata, stats });
            } catch {
              await rm(fullDir, { recursive: true, force: true }).catch(() => {
              });
            }
          }
        } catch {
        }
      }
      entries.sort((a, b) => a.stats.atime.getTime() - b.stats.atime.getTime());
      let currentSizeMB = sizeMB;
      for (const entry of entries) {
        if (currentSizeMB <= this.maxSizeMB * 0.8) break;
        const entrySize = await getDirectorySize(entry.dir);
        await rm(entry.dir, { recursive: true, force: true });
        currentSizeMB -= entrySize / (1024 * 1024);
      }
    }
  }
  /**
   * Get cache statistics
   */
  async getStats() {
    const sizeMB = await this.getCacheSize();
    let websiteCount = 0;
    let repoCount = 0;
    try {
      websiteCount = (await readdir(join$1(this.cacheDir, "websites"))).length;
    } catch {
    }
    try {
      repoCount = (await readdir(join$1(this.cacheDir, "repos"))).length;
    } catch {
    }
    return {
      sizeMB,
      entryCount: websiteCount + repoCount,
      websiteCount,
      repoCount
    };
  }
}
async function getDirectorySize(dir) {
  let size = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join$1(dir, entry.name);
      if (entry.isDirectory()) {
        size += await getDirectorySize(fullPath);
      } else {
        const stats = await stat(fullPath);
        size += stats.size;
      }
    }
  } catch {
  }
  return size;
}

function escapeGlobPath(str) {
  const normalized = str.replace(/\\/g, "/");
  return normalized.replace(/[*?[\]{}()!@+|]/g, (match) => "\\" + match);
}
async function collectFiles(baseDir, options) {
  const {
    ig,
    extensionSet,
    excludeFiles,
    includeFiles,
    excludeDirs,
    includeDirs,
    verbose
  } = options;
  function logVerbose(message, level) {
    if (verbose >= level) {
      console.log(message);
    }
  }
  const patterns = [];
  if (includeDirs?.length) {
    patterns.push(...includeDirs.map((dir) => `${escapeGlobPath(dir)}/**/*`));
  } else {
    patterns.push("**/*");
  }
  const ignore = [
    ...excludeDirs?.map((dir) => `${escapeGlobPath(dir)}/**`) || [],
    ...excludeFiles?.map((file) => file.replace(/\\/g, "/")) || []
  ];
  if (extensionSet) {
    const exts = [...extensionSet];
    patterns.length = 0;
    if (includeDirs?.length) {
      for (const dir of includeDirs) {
        for (const ext of exts) {
          patterns.push(`${escapeGlobPath(dir)}/**/*${ext}`);
        }
      }
    } else {
      for (const ext of exts) {
        patterns.push(`**/*${ext}`);
      }
    }
  }
  if (includeFiles?.length) {
    patterns.length = 0;
    patterns.push(...includeFiles.map((file) => file.replace(/\\/g, "/")));
  }
  logVerbose(`Scanning with patterns: ${patterns.join(", ")}`, 2);
  logVerbose(`Ignoring: ${ignore.join(", ")}`, 2);
  const entries = await fg(patterns, {
    cwd: baseDir.replace(/\\/g, "/"),
    dot: true,
    absolute: true,
    ignore,
    onlyFiles: true,
    suppressErrors: true,
    followSymbolicLinks: true,
    caseSensitiveMatch: true
  });
  return entries.filter((entry) => {
    const relativePath = path.relative(process.cwd(), entry);
    return !ig.ignores(relativePath);
  });
}

async function collectFilesAsTree(baseDir, files, options = {}) {
  const root = {
    name: path.basename(baseDir),
    path: "",
    type: "directory",
    children: []
  };
  let totalSize = 0;
  let totalTokens = 0;
  files.sort();
  for (const filePath of files) {
    const relativePath = path.relative(baseDir, filePath);
    const pathParts = relativePath.split(path.sep);
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
    try {
      const fileName = pathParts.at(-1);
      const content = await readFile(filePath, "utf8");
      const stats = await stat(filePath);
      const encoder = options.tokenEncoder || "simple";
      const tokens = await countTokens(content, encoder);
      const fileNode = {
        name: fileName,
        path: relativePath,
        type: "file",
        content,
        language: detectLanguage(fileName),
        size: stats.size,
        tokens,
        lastModified: stats.mtime
      };
      if (!currentNode.children) {
        currentNode.children = [];
      }
      currentNode.children.push(fileNode);
      totalSize += stats.size;
      totalTokens += tokens;
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
    }
  }
  sortTreeChildren(root);
  return { root, totalSize, totalTokens };
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

const DEFAULT_IGNORE_PATTERNS = `
# avoid recursion
codefetch/

# Git
.git/**
**/.git/**
.gitignore
.gitattributes

# Version Control
.git/
.gitignore
.gitattributes
.svn/
.hg/

# Package Manager Files
package-lock.json
yarn.lock
pnpm-lock.yaml
bun.lockb
.npmrc
.yarnrc
.pnpmrc
.npmignore

# Project Config
.codefetchignore
.editorconfig
.eslintrc*
.eslintcache
.prettierrc*
.stylelintrc*
.tsbuildinfo
.prettierignore

# Binary and Image Files
# Images
*.png
*.jpg
*.jpeg
*.gif
*.ico
*.webp
*.bmp
*.tiff
*.tif
*.raw
*.cr2
*.nef
*.heic
*.heif
*.avif
*.svg
*.eps
*.ai
*.psd
*.xcf

# Videos
*.mp4
*.mov
*.avi
*.wmv
*.flv
*.mkv
*.webm
*.m4v
*.mpg
*.mpeg
*.3gp
*.3g2
*.ogv
*.vob

# Audio
*.mp3
*.wav
*.ogg
*.m4a
*.flac
*.aac
*.wma
*.aiff
*.mid
*.midi

# Documents and PDFs
*.pdf
*.doc
*.docx
*.xls
*.xlsx
*.ppt
*.pptx
*.odt
*.ods
*.odp
*.pages
*.numbers
*.key

# Archives and Compressed
*.zip
*.tar
*.gz
*.tgz
*.rar
*.7z
*.bz2
*.xz
*.lz
*.lzma
*.lzo
*.rz
*.lz4
*.zst
*.br
*.cab
*.iso
*.dmg
*.img

# Binary and Executable
*.exe
*.dll
*.so
*.dylib
*.bin
*.o
*.obj
*.lib
*.a
*.class
*.pyc
*.pyo
*.pyd
*.deb
*.rpm
*.pkg
*.app
*.sys
*.ko

# Database and Data Files
*.dat
*.db
*.sqlite
*.sqlite3
*.mdb
*.accdb
*.dbf
*.mdf
*.ldf
*.frm
*.ibd
*.idx
*.dmp
*.bak
*.bson

# Font Files
*.ttf
*.otf
*.woff
*.woff2
*.eot

# Model and 3D Files
*.fbx
*.obj
*.max
*.blend
*.dae
*.mb
*.ma
*.3ds
*.c4d
*.stl
*.glb
*.gltf

# IDE and Editor Files
.idea/
.vscode/
*.swp
*.swo
*.swn
*.bak

# Build and Cache
dist/
build/
out/
workspace-data/
.cache/
.temp/
tmp/
*.min.js
*.min.css

# NXT Files
*.nxt
.nxt/
.nxt-cache/
nxt-env.d.ts
nxt.config.*
.nxtrc
.nxt-workspace/

# Logs and Debug
*.log
debug.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment and Secrets
.env
.env.*
.env-*
*.env
env.*
*.pem
*.key
*.cert
*.secret
*.secrets
*secret*
*secrets*
*credential*
*credentials*
*password*
*passwords*
*token*
*tokens*

# Documentation
LICENSE*
LICENCE*
README*
CHANGELOG*
CONTRIBUTING*

# OS Files
.DS_Store
Thumbs.db
desktop.ini
`.trim();

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

const codegen = {
  __proto__: null,
  default: codegen_default
};

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

const fix = {
  __proto__: null,
  default: fix_default
};

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

const improve = {
  __proto__: null,
  default: improve_default
};

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

const testgen = {
  __proto__: null,
  default: testgen_default
};

class GitHubApiClient {
  constructor(owner, repo, logger, options = {}) {
    this.owner = owner;
    this.repo = repo;
    this.logger = logger;
    this.options = options;
    this.headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Codefetch/1.0"
    };
    if (options.token) {
      this.headers.Authorization = `token ${options.token}`;
    }
  }
  baseUrl = "https://api.github.com";
  headers;
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
      throw new Error(
        "GitHub API did not provide Content-Length header. Cannot download archive without knowing its size."
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
    const tempDir = await mkdtemp(join$1(tmpdir(), "codefetch-zip-"));
    const zipPath = join$1(tempDir, "repo.zip");
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
        const targetPath = join$1(targetDir, relativePath);
        const targetDirPath = join$1(
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
async function fetchGitHubViaApi(parsedUrl, targetDir, logger, options = {}) {
  if (!parsedUrl.gitOwner || !parsedUrl.gitRepo) {
    logger.debug("Invalid GitHub URL - missing owner or repo");
    return false;
  }
  const client = new GitHubApiClient(
    parsedUrl.gitOwner,
    parsedUrl.gitRepo,
    logger,
    {
      token: options.token || process.env.GITHUB_TOKEN,
      branch: options.branch || parsedUrl.gitRef
    }
  );
  const { accessible, isPrivate, defaultBranch } = await client.checkAccess();
  if (!accessible) {
    logger.debug(
      "Repository not accessible via API, falling back to git clone"
    );
    return false;
  }
  if (isPrivate && !options.token && !process.env.GITHUB_TOKEN) {
    logger.debug(
      "Private repository requires authentication, falling back to git clone"
    );
    return false;
  }
  try {
    const branch = options.branch || parsedUrl.gitRef || defaultBranch;
    client.options.branch = branch;
    await client.downloadToDirectory(targetDir, {
      extensions: options.extensions,
      excludeDirs: options.excludeDirs || [
        "node_modules",
        ".git",
        "dist",
        "build"
      ],
      maxFiles: options.maxFiles || 1e3
    });
    return true;
  } catch (error) {
    console.error("GitHub API error:", error);
    logger.warn(`GitHub API fetch failed: ${error}`);
    logger.debug(`Full error:`, error);
    return false;
  }
}

async function fetchFromWeb(url, options = {}) {
  const logger = {
    info: (msg) => options.verbose && options.verbose >= 1 && console.error(`[INFO] ${msg}`),
    debug: (msg) => options.verbose && options.verbose >= 2 && console.error(`[DEBUG] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
    success: (msg) => console.error(`[SUCCESS] ${msg}`),
    warn: (msg) => console.error(`[WARN] ${msg}`)
  };
  const validation = validateURL(url);
  if (!validation.valid) {
    throw new Error(`Invalid URL: ${validation.error}`);
  }
  const parsedUrl = parseURL(url);
  if (!parsedUrl) {
    throw new Error("Failed to parse URL");
  }
  logger.info(`Fetching from: ${parsedUrl.url}`);
  logger.info(
    `Repository: ${parsedUrl.gitProvider}:${parsedUrl.gitOwner}/${parsedUrl.gitRepo}`
  );
  const cache = new WebCache({
    ttlHours: options.cacheTTL || 1
  });
  await cache.init();
  let contentPath = null;
  if (options.noCache) {
    logger.debug("Cache disabled");
  } else {
    const cached = await cache.get(parsedUrl);
    if (cached) {
      logger.info("Using cached content");
      contentPath = cached.content;
    }
  }
  if (!contentPath) {
    contentPath = await fetchGitRepository(parsedUrl, options, logger);
    await cache.set(parsedUrl, contentPath);
  }
  logger.info("Analyzing fetched content...");
  let output;
  let totalTokens = 0;
  const originalCwd = process.cwd();
  process.chdir(contentPath);
  const ig = ignore().add(
    DEFAULT_IGNORE_PATTERNS.split("\n").filter(
      (line) => line && !line.startsWith("#")
    )
  );
  const files = await collectFiles(".", {
    ig,
    extensionSet: options.extensions ? new Set(options.extensions) : null,
    excludeFiles: options.excludeFiles || null,
    includeFiles: options.includeFiles || null,
    excludeDirs: options.excludeDirs || null,
    includeDirs: options.includeDirs || null,
    verbose: options.verbose || 0
  });
  if (options.format === "json") {
    const {
      root,
      totalSize,
      totalTokens: tokens
    } = await collectFilesAsTree(".", files, {
      tokenEncoder: options.tokenEncoder,
      tokenLimit: options.maxTokens
    });
    totalTokens = tokens;
    const metadata = {
      totalFiles: files.length,
      totalSize,
      totalTokens,
      fetchedAt: /* @__PURE__ */ new Date(),
      source: parsedUrl.url,
      gitProvider: parsedUrl.gitProvider,
      gitOwner: parsedUrl.gitOwner,
      gitRepo: parsedUrl.gitRepo,
      gitRef: parsedUrl.gitRef || options.branch || "main"
    };
    output = new FetchResultImpl(root, metadata);
  } else {
    const markdown = await generateMarkdown(files, {
      maxTokens: options.maxTokens ? Number(options.maxTokens) : null,
      verbose: Number(options.verbose || 0),
      projectTree: Number(options.projectTree || 0),
      tokenEncoder: options.tokenEncoder || "cl100k",
      disableLineNumbers: Boolean(options.disableLineNumbers),
      tokenLimiter: options.tokenLimiter || "truncated",
      templateVars: {
        ...options.templateVars,
        SOURCE_URL: parsedUrl.url,
        FETCHED_FROM: `${parsedUrl.gitProvider}:${parsedUrl.gitOwner}/${parsedUrl.gitRepo}`
      }
    });
    output = markdown;
  }
  process.chdir(originalCwd);
  return output;
}
async function fetchGitRepository(parsedUrl, options, logger) {
  const tempDir = await mkdtemp(join$1(tmpdir(), "codefetch-git-"));
  const repoPath = join$1(tempDir, "repo");
  try {
    if (parsedUrl.gitProvider === "github" && !options.noApi) {
      logger.info("Attempting to fetch via GitHub API...");
      const apiSuccess = await fetchGitHubViaApi(parsedUrl, repoPath, logger, {
        branch: options.branch || parsedUrl.gitRef,
        token: options.githubToken || process.env.GITHUB_TOKEN,
        extensions: options.extensions,
        excludeDirs: options.excludeDirs,
        maxFiles: 1e3
      });
      if (apiSuccess) {
        logger.success("Repository fetched successfully via API");
        return repoPath;
      }
      logger.info("Falling back to git clone...");
    }
    if (isCloudflareWorker) {
      throw new Error(
        "git clone is not supported in Cloudflare Workers. Use a public GitHub repo or provide GITHUB_TOKEN for ZIP mode."
      );
    }
    logger.info("Cloning repository...");
    const cloneArgs = ["clone"];
    if (!options.branch || options.branch === "HEAD") {
      cloneArgs.push("--depth", "1");
    }
    cloneArgs.push(parsedUrl.normalizedUrl);
    cloneArgs.push(repoPath);
    if (options.branch && options.branch !== "HEAD") {
      cloneArgs.push("--branch", options.branch);
      cloneArgs.push("--single-branch");
    }
    const gitCommand = `git ${cloneArgs.join(" ")}`;
    logger.debug(`Running: ${gitCommand}`);
    execSync(gitCommand, {
      stdio: options.verbose && options.verbose >= 3 ? "inherit" : "pipe"
    });
    if (parsedUrl.gitRef && !options.branch) {
      logger.info(`Checking out ref: ${parsedUrl.gitRef}`);
      execSync(`git checkout ${parsedUrl.gitRef}`, {
        cwd: repoPath,
        stdio: "pipe"
      });
    }
    logger.success("Repository cloned successfully");
    return repoPath;
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw new Error(
      `Failed to fetch repository: ${error instanceof Error ? error.message : String(error)}`
    );
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

export { VALID_ENCODERS, VALID_LIMITERS, VALID_PROMPTS, codegen_default as codegenPrompt, collectFilesAsTree, countTokens, fetchFromWeb, fix_default as fixPrompt, generateMarkdown, generateMarkdownFromContent, generateProjectTree, getCacheSizeLimit, getDefaultConfig, htmlToMarkdown, improve_default as improvePrompt, isCloudflareWorker, mergeWithCliArgs, resolveCodefetchConfig, testgen_default as testgenPrompt };
