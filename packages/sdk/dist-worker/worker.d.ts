type TokenEncoder = "simple" | "p50k" | "o200k" | "cl100k";
type TokenLimiter = "sequential" | "truncated";
interface FileNode {
    name: string;
    path: string;
    type: "file" | "directory";
    content?: string;
    language?: string;
    size?: number;
    tokens?: number;
    lastModified?: Date;
    children?: FileNode[];
}
interface FetchMetadata {
    totalFiles: number;
    totalSize: number;
    totalTokens: number;
    fetchedAt: Date;
    source: string;
}
interface FetchResult {
    root: FileNode;
    metadata: FetchMetadata;
}
type OutputFormat = "markdown" | "json";

interface CodefetchConfig {
    outputFile: string;
    outputPath: string;
    maxTokens: number;
    includeFiles?: string[];
    excludeFiles?: string[];
    includeDirs?: string[];
    excludeDirs?: string[];
    verbose: number;
    extensions?: string[];
    defaultIgnore: boolean;
    gitignore: boolean;
    projectTree: number;
    tokenEncoder: TokenEncoder;
    tokenLimiter: TokenLimiter;
    trackedModels?: string[];
    dryRun?: boolean;
    disableLineNumbers?: boolean;
    tokenCountOnly?: boolean;
    defaultPromptFile: string;
    defaultChat?: string;
    templateVars?: Record<string, string>;
    format?: OutputFormat;
}
declare const getDefaultConfig: () => CodefetchConfig;
declare function resolveCodefetchConfig(config: CodefetchConfig, cwd: string): Promise<CodefetchConfig>;
declare function mergeWithCliArgs(config: CodefetchConfig, cliArgs: Partial<CodefetchConfig>): CodefetchConfig;

declare const countTokens: (text: string, encoder: TokenEncoder) => Promise<number>;

declare const VALID_PROMPTS: Set<string>;
declare const VALID_ENCODERS: Set<string>;
declare const VALID_LIMITERS: Set<string>;

interface MarkdownGeneratorOptions {
    maxTokens: number | null;
    verbose?: number;
    projectTree?: number;
    tokenEncoder: TokenEncoder;
    disableLineNumbers?: boolean;
    tokenLimiter?: TokenLimiter;
    promptFile?: string;
    templateVars?: Record<string, string>;
    onVerbose?: (message: string, level: number) => void;
}
declare function generateMarkdown(files: string[], options: MarkdownGeneratorOptions): Promise<string>;

/**
 * Worker-compatible markdown generation from file content objects
 */

interface FileContent {
    path: string;
    content: string;
}
interface MarkdownFromContentOptions {
    maxTokens?: number;
    includeTreeStructure?: boolean;
    tokenEncoder?: TokenEncoder;
    disableLineNumbers?: boolean;
}
/**
 * Generate markdown from file content objects (Worker-compatible)
 * This function doesn't require filesystem access
 */
declare function generateMarkdownFromContent(files: FileContent[], options?: MarkdownFromContentOptions): Promise<string>;

interface WebFetchConfig {
    url: string;
    cacheTTL?: number;
    branch?: string;
    noCache?: boolean;
    noApi?: boolean;
    githubToken?: string;
}
interface CrawlOptions {
    maxDepth?: number;
    maxPages?: number;
    ignoreRobots?: boolean;
    ignoreCors?: boolean;
    followRedirects?: boolean;
    userAgent?: string;
}
interface CrawlResult {
    url: string;
    content: string;
    links: string[];
    depth: number;
    error?: string;
}

declare function collectFilesAsTree(baseDir: string, files: string[], options?: {
    tokenEncoder?: string;
    tokenLimit?: number;
}): Promise<{
    root: FileNode;
    totalSize: number;
    totalTokens: number;
}>;

declare function generateProjectTree(baseDir: string, maxLevel?: number): string;

declare class FetchResultImpl {
    root: FileNode;
    metadata: FetchMetadata;
    constructor(root: FileNode, metadata: FetchMetadata);
    /**
     * Get a file node by its path
     */
    getFileByPath(path: string): FileNode | null;
    /**
     * Get all files as a flat array
     */
    getAllFiles(): FileNode[];
    /**
     * Convert to markdown format
     */
    toMarkdown(): string;
    /**
     * Build tree string representation
     */
    private buildTreeString;
}

interface FetchOptions extends Partial<CodefetchConfig> {
    source?: string;
    format?: OutputFormat;
}

declare const _default$3: "You are a senior developer. You produce optimized, maintainable code that follows best practices. \n\nYour task is to write code according to my instructions for the current codebase.\n\ninstructions:\n<message>\n{{MESSAGE}}\n</message>\n\nRules:\n- Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. \n- Your output should be a series of specific, actionable changes.\n\nWhen approaching this task:\n1. Carefully review the provided code.\n2. Identify the area thats raising this issue or error and provide a fix.\n3. Consider best practices for the specific programming language used.\n\nFor each suggested change, provide:\n1. A short description of the change (one line maximum).\n2. The modified code block.\n\nUse the following format for your output:\n\n[Short Description]\n```[language]:[path/to/file]\n[code block]\n```\n\nBegin fixing the codebase provide your solutions.\n\nMy current codebase:\n<current_codebase>\n{{CURRENT_CODEBASE}}\n</current_codebase>\n";

declare const _default$2: "You are a senior developer. You produce optimized, maintainable code that follows best practices. \n\nYour task is to review the current codebase and fix the current issues.\n\nCurrent Issue:\n<issue>\n{{MESSAGE}}\n</issue>\n\nRules:\n- Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. \n- Your output should be a series of specific, actionable changes.\n\nWhen approaching this task:\n1. Carefully review the provided code.\n2. Identify the area thats raising this issue or error and provide a fix.\n3. Consider best practices for the specific programming language used.\n\nFor each suggested change, provide:\n1. A short description of the change (one line maximum).\n2. The modified code block.\n\nUse the following format for your output:\n\n[Short Description]\n```[language]:[path/to/file]\n[code block]\n```\n\nBegin fixing the codebase provide your solutions.\n\nMy current codebase:\n<current_codebase>\n{{CURRENT_CODEBASE}}\n</current_codebase>\n";

declare const _default$1: "You are a senior software architect. You produce optimized, maintainable code that follows best practices. \n\nYour task is to review the current codebase and suggest improvements or optimizations.\n\nRules:\n- Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. \n- Your output should be a series of specific, actionable changes.\n\nWhen approaching this task:\n1. Carefully review the provided code.\n2. Identify areas that could be improved in terms of efficiency, readability, or maintainability.\n3. Consider best practices for the specific programming language used.\n4. Think about potential optimizations that could enhance performance.\n5. Look for opportunities to refactor or restructure the code for better organization.\n\nFor each suggested change, provide:\n1. A short description of the change (one line maximum).\n2. The modified code block.\n\nUse the following format for your output:\n\n[Short Description]\n```[language]:[path/to/file]\n[code block]\n```\n\nBegin your analysis and provide your suggestions now.\n\nMy current codebase:\n<current_codebase>\n{{CURRENT_CODEBASE}}\n</current_codebase>\n";

declare const _default: "You are a senior test developer. You produce optimized, maintainable code that follows best practices. \n\nYour task is to review the current codebase and create and improve missing tests for the codebase.\n\nAdditional instructions:\n<message>\n{{MESSAGE}}\n</message>\n\nRules:\n- Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. \n- Your output should be a series of specific, actionable changes.\n\nWhen approaching this task:\n1. Carefully review the provided code.\n2. Identify the area thats raising this issue or error and provide a fix.\n3. Consider best practices for the specific programming language used.\n\nFor each suggested change, provide:\n1. A short description of the change (one line maximum).\n2. The modified code block.\n\nUse the following format for your output:\n\n[Short Description]\n```[language]:[path/to/file]\n[code block]\n```\n\nBegin fixing the codebase provide your solutions.\n\nMy current codebase:\n<current_codebase>\n{{CURRENT_CODEBASE}}\n</current_codebase>\n";

declare function fetchFromWeb(url: string, options?: FetchOptions): Promise<string | FetchResultImpl>;

/**
 * Browser-compatible HTML to Markdown converter
 * Designed for Cloudflare Workers without external dependencies
 */
interface HtmlToMarkdownOptions {
    /** Whether to include link URLs inline */
    includeUrls?: boolean;
    /** Whether to preserve whitespace */
    preserveWhitespace?: boolean;
    /** Custom replacements */
    customReplacements?: Array<{
        pattern: RegExp;
        replacement: string;
    }>;
}
/**
 * Convert HTML string to Markdown format
 * This is a lightweight implementation suitable for Worker environments
 */
declare function htmlToMarkdown(html: string, options?: HtmlToMarkdownOptions): string;

/**
 * Runtime environment detection for Cloudflare Workers
 */
/**
 * Detect if code is running in a Cloudflare Worker environment
 * Workers have WebSocketPair but no __dirname in globalThis
 */
declare const isCloudflareWorker: boolean;
/**
 * Get environment-specific cache size limit in bytes
 */
declare const getCacheSizeLimit: () => number;

export { type CodefetchConfig, type CrawlOptions, type CrawlResult, type FetchResult, type FileContent, type FileNode, type MarkdownFromContentOptions, VALID_ENCODERS, VALID_LIMITERS, VALID_PROMPTS, type WebFetchConfig, _default$3 as codegenPrompt, collectFilesAsTree, countTokens, fetchFromWeb, _default$2 as fixPrompt, generateMarkdown, generateMarkdownFromContent, generateProjectTree, getCacheSizeLimit, getDefaultConfig, htmlToMarkdown, _default$1 as improvePrompt, isCloudflareWorker, mergeWithCliArgs, resolveCodefetchConfig, _default as testgenPrompt };
