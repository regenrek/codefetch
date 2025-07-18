import { existsSync } from "node:fs";
import { parse, join, dirname } from "pathe";

export const findProjectRoot = (startDir: string): string => {
  let currentDir = startDir;
  while (currentDir !== parse(currentDir).root) {
    if (existsSync(join(currentDir, "package.json"))) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }
  return startDir;
};

export const detectLanguage = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
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
    svelte: "svelte",
  };

  // Special cases for files without extensions
  const fileNameLower = fileName.toLowerCase();
  if (fileNameLower === "dockerfile") return "dockerfile";
  if (fileNameLower === "makefile") return "makefile";
  if (fileNameLower === "cmakelists.txt") return "cmake";

  return languageMap[ext || ""] || "text";
};

/**
 * Create a simple hash from a string
 * Uses a basic hashing algorithm suitable for cache keys
 */
export function createHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.codePointAt(i) || 0;
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to hexadecimal string
  return Math.abs(hash).toString(16);
}
