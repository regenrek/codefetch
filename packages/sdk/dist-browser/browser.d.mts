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
interface PerformanceMetrics {
    fetchDuration: number;
    parseFiles: number;
    tokenCountDuration: number;
    totalDuration: number;
    memoryUsed?: number;
}
interface FetchMetadata {
    totalFiles: number;
    totalSize: number;
    totalTokens: number;
    fetchedAt: Date;
    source: string;
    gitProvider?: string;
    gitOwner?: string;
    gitRepo?: string;
    gitRef?: string;
    metrics?: PerformanceMetrics;
}
interface FetchResult {
    root: FileNode;
    metadata: FetchMetadata;
}
type OutputFormat = "markdown" | "json";

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

declare const countTokens: (text: string, encoder: TokenEncoder) => Promise<number>;
declare const SUPPORTED_MODELS: {
    readonly simple: readonly ["*"];
    readonly p50k: readonly ["text-davinci-003", "text-davinci-002", "code-davinci-002"];
    readonly o200k: readonly ["gpt-4o-2024-11-20", "gpt-4o-2024-08-06", "gpt-4o-2024-05-13", "gpt-4o-mini-2024-07-18"];
    readonly cl100k: readonly ["gpt-4", "gpt-3.5-turbo", "gpt-35-turbo"];
};

/**
 * Worker-compatible markdown generation from file content objects
 */

interface FileContent {
    path: string;
    content: string;
    language?: string;
    mimeType?: string;
    size?: number;
    tokens?: number;
    encoding?: string;
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

/**
 * Browser-safe utility functions
 * These functions do not depend on any Node.js APIs
 */
declare const detectLanguage: (fileName: string) => string;

declare const VALID_PROMPTS: Set<string>;
declare const VALID_ENCODERS: Set<string>;
declare const VALID_LIMITERS: Set<string>;

declare const _default$3: "You are a senior developer. You produce optimized, maintainable code that follows best practices. \n\nYour task is to write code according to my instructions for the current codebase.\n\ninstructions:\n<message>\n{{MESSAGE}}\n</message>\n\nRules:\n- Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. \n- Your output should be a series of specific, actionable changes.\n\nWhen approaching this task:\n1. Carefully review the provided code.\n2. Identify the area thats raising this issue or error and provide a fix.\n3. Consider best practices for the specific programming language used.\n\nFor each suggested change, provide:\n1. A short description of the change (one line maximum).\n2. The modified code block.\n\nUse the following format for your output:\n\n[Short Description]\n```[language]:[path/to/file]\n[code block]\n```\n\nBegin fixing the codebase provide your solutions.\n\nMy current codebase:\n<current_codebase>\n{{CURRENT_CODEBASE}}\n</current_codebase>\n";

declare const _default$2: "You are a senior developer. You produce optimized, maintainable code that follows best practices. \n\nYour task is to review the current codebase and fix the current issues.\n\nCurrent Issue:\n<issue>\n{{MESSAGE}}\n</issue>\n\nRules:\n- Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. \n- Your output should be a series of specific, actionable changes.\n\nWhen approaching this task:\n1. Carefully review the provided code.\n2. Identify the area thats raising this issue or error and provide a fix.\n3. Consider best practices for the specific programming language used.\n\nFor each suggested change, provide:\n1. A short description of the change (one line maximum).\n2. The modified code block.\n\nUse the following format for your output:\n\n[Short Description]\n```[language]:[path/to/file]\n[code block]\n```\n\nBegin fixing the codebase provide your solutions.\n\nMy current codebase:\n<current_codebase>\n{{CURRENT_CODEBASE}}\n</current_codebase>\n";

declare const _default$1: "You are a senior software architect. You produce optimized, maintainable code that follows best practices. \n\nYour task is to review the current codebase and suggest improvements or optimizations.\n\nRules:\n- Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. \n- Your output should be a series of specific, actionable changes.\n\nWhen approaching this task:\n1. Carefully review the provided code.\n2. Identify areas that could be improved in terms of efficiency, readability, or maintainability.\n3. Consider best practices for the specific programming language used.\n4. Think about potential optimizations that could enhance performance.\n5. Look for opportunities to refactor or restructure the code for better organization.\n\nFor each suggested change, provide:\n1. A short description of the change (one line maximum).\n2. The modified code block.\n\nUse the following format for your output:\n\n[Short Description]\n```[language]:[path/to/file]\n[code block]\n```\n\nBegin your analysis and provide your suggestions now.\n\nMy current codebase:\n<current_codebase>\n{{CURRENT_CODEBASE}}\n</current_codebase>\n";

declare const _default: "You are a senior test developer. You produce optimized, maintainable code that follows best practices. \n\nYour task is to review the current codebase and create and improve missing tests for the codebase.\n\nAdditional instructions:\n<message>\n{{MESSAGE}}\n</message>\n\nRules:\n- Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. \n- Your output should be a series of specific, actionable changes.\n\nWhen approaching this task:\n1. Carefully review the provided code.\n2. Identify the area thats raising this issue or error and provide a fix.\n3. Consider best practices for the specific programming language used.\n\nFor each suggested change, provide:\n1. A short description of the change (one line maximum).\n2. The modified code block.\n\nUse the following format for your output:\n\n[Short Description]\n```[language]:[path/to/file]\n[code block]\n```\n\nBegin fixing the codebase provide your solutions.\n\nMy current codebase:\n<current_codebase>\n{{CURRENT_CODEBASE}}\n</current_codebase>\n";

declare const prompts: {
    codegen: string;
    fix: string;
    improve: string;
    testgen: string;
};

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

type CacheStrategy = "auto" | "force" | "bypass" | "refresh" | "validate";

interface FetchOptions extends Partial<CodefetchConfig> {
    source?: string;
    format?: OutputFormat;
    cache?: boolean | CacheStrategy;
    cacheKey?: string;
    cacheTTL?: number;
    cacheNamespace?: string;
    cacheBaseUrl?: string;
    noCache?: boolean;
}

/**
 * Cloudflare Worker-compatible web fetch implementation
 * Works with in-memory content instead of file system operations
 */

/**
 * Fetch web content in a Worker-compatible way
 */
declare function fetchFromWebWorker(url: string, options?: FetchOptions): Promise<string | FetchResultImpl>;

export { type FetchMetadata, type FetchResult, FetchResultImpl, type FileContent, type FileNode, type MarkdownFromContentOptions, SUPPORTED_MODELS, type TokenEncoder, VALID_ENCODERS, VALID_LIMITERS, VALID_PROMPTS, _default$3 as codegenPrompt, countTokens, detectLanguage, fetchFromWebWorker as fetch, _default$2 as fixPrompt, generateMarkdownFromContent, _default$1 as improvePrompt, prompts, _default as testgenPrompt };
