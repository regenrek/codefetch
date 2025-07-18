/**
 * Worker-safe configuration utilities
 * No file system operations, only in-memory config handling
 */
interface CodefetchConfig$1 {
    format: "markdown" | "json";
    extensions: string[];
    excludeFiles: string[];
    includeFiles: string[];
    excludeDirs: string[];
    includeDirs: string[];
    verbose: number;
    projectTree: number;
    dryRun: boolean;
    maxTokens: number;
    tokenEncoder: string;
    disableLineNumbers: boolean;
    defaultIgnore: boolean;
    gitignore: boolean;
    tokenLimiter: string;
    tokenCountOnly: boolean;
    promptFile?: string;
    prompt?: string;
    templateVars: Record<string, string>;
}
/**
 * Get default configuration for Workers
 */
declare function getDefaultConfig(): CodefetchConfig$1;
/**
 * Resolve configuration in Workers (no file system)
 */
declare function resolveCodefetchConfig(cwd?: string, overrides?: Partial<CodefetchConfig$1>): Promise<CodefetchConfig$1>;
/**
 * Merge configuration with CLI arguments
 */
declare function mergeWithCliArgs(config: CodefetchConfig$1, args: any): CodefetchConfig$1;

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

declare const countTokens: (text: string, encoder: TokenEncoder) => Promise<number>;

declare const VALID_PROMPTS: Set<string>;
declare const VALID_ENCODERS: Set<string>;
declare const VALID_LIMITERS: Set<string>;

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

/**
 * Cloudflare Worker-compatible web fetch implementation
 * Works with in-memory content instead of file system operations
 */

/**
 * Fetch web content in a Worker-compatible way
 */
declare function fetchFromWebWorker(url: string, options?: FetchOptions): Promise<string | FetchResultImpl>;

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

/**
 * Tree structure utilities for converting between flat file arrays and tree structures
 */

/**
 * Convert a flat array of files to a tree structure
 */
declare function filesToTree(files: FileContent[]): FileNode;
/**
 * Convert a tree structure back to a flat array of files
 */
declare function treeToFiles(root: FileNode): FileContent[];
/**
 * Find a node by its path in the tree
 */
declare function findNodeByPath(root: FileNode, path: string): FileNode | null;
/**
 * Walk the tree and call a callback for each node
 */
declare function walkTree(root: FileNode, callback: (node: FileNode, depth: number) => void, depth?: number): void;
/**
 * Calculate total size and token count for a tree
 */
declare function calculateTreeMetrics(root: FileNode): {
    totalFiles: number;
    totalSize: number;
    totalTokens: number;
};
/**
 * Sort tree nodes (directories first, then files, alphabetically)
 */
declare function sortTree(root: FileNode): FileNode;
/**
 * Filter tree based on a predicate function
 */
declare function filterTree(root: FileNode, predicate: (node: FileNode) => boolean): FileNode | null;

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

/**
 * Browser-safe utility functions
 * These functions do not depend on any Node.js APIs
 */
declare const detectLanguage: (fileName: string) => string;

/**
 * Custom error classes for better error handling and debugging
 */
/**
 * Base error class for all Codefetch errors
 */
declare class CodefetchError extends Error {
    code: string;
    constructor(message: string, code: string);
}
/**
 * Error thrown when GitHub API requests fail
 */
declare class GitHubError extends CodefetchError {
    status: number;
    rateLimitRemaining?: number | undefined;
    rateLimitReset?: Date | undefined;
    constructor(message: string, status: number, rateLimitRemaining?: number | undefined, rateLimitReset?: Date | undefined);
}
/**
 * Error thrown when token limit is exceeded
 */
declare class TokenLimitError extends CodefetchError {
    limit: number;
    used: number;
    files: string[];
    constructor(limit: number, used: number, files: string[]);
}
/**
 * Error thrown when parsing files or content fails
 */
declare class ParseError extends CodefetchError {
    filePath: string;
    line?: number | undefined;
    column?: number | undefined;
    constructor(message: string, filePath: string, line?: number | undefined, column?: number | undefined);
}
/**
 * Error thrown when network requests fail
 */
declare class NetworkError extends CodefetchError {
    url: string;
    cause?: Error | undefined;
    constructor(message: string, url: string, cause?: Error | undefined);
}
/**
 * Error thrown when configuration is invalid
 */
declare class ConfigError extends CodefetchError {
    configPath?: string | undefined;
    invalidField?: string | undefined;
    constructor(message: string, configPath?: string | undefined, invalidField?: string | undefined);
}
/**
 * Error thrown when cache operations fail
 */
declare class CacheError extends CodefetchError {
    operation: "read" | "write" | "delete";
    key?: string | undefined;
    constructor(message: string, operation: "read" | "write" | "delete", key?: string | undefined);
}
/**
 * Error thrown when URL validation fails
 */
declare class URLValidationError extends CodefetchError {
    url: string;
    reason: string;
    constructor(message: string, url: string, reason: string);
}
/**
 * Type guard to check if an error is a CodefetchError
 */
declare function isCodefetchError(error: unknown): error is CodefetchError;
/**
 * Type guard to check if an error is a GitHubError
 */
declare function isGitHubError(error: unknown): error is GitHubError;
/**
 * Type guard to check if an error is a TokenLimitError
 */
declare function isTokenLimitError(error: unknown): error is TokenLimitError;
/**
 * Helper to wrap unknown errors in a CodefetchError
 */
declare function wrapError(error: unknown, code?: string): CodefetchError;

/**
 * Streaming API support for handling large repositories efficiently
 */

interface StreamOptions {
    maxTokens?: number;
    tokenEncoder?: TokenEncoder;
    extensions?: string[];
    excludeDirs?: string[];
    includeTreeStructure?: boolean;
}
/**
 * Stream GitHub files as they're extracted from tarball
 * This is a generator function that yields files one by one
 */
declare function streamGitHubFiles(owner: string, repo: string, options?: StreamOptions & {
    branch?: string;
    token?: string;
}): AsyncGenerator<FileContent, void, unknown>;
/**
 * Create a ReadableStream that generates markdown from files
 * This allows streaming markdown generation for large codebases
 */
declare function createMarkdownStream(files: AsyncIterable<FileContent>, options?: MarkdownFromContentOptions): ReadableStream<string>;
/**
 * Stream processing with transform - allows processing files as they stream
 */
declare function createTransformStream<T>(transform: (file: FileContent) => Promise<T> | T): TransformStream<FileContent, T>;
/**
 * Helper to collect streamed files into an array
 */
declare function collectStream<T>(stream: AsyncIterable<T>): Promise<T[]>;
/**
 * Stream filter - only pass through files that match predicate
 */
declare function filterStream<T>(stream: AsyncIterable<T>, predicate: (item: T) => boolean | Promise<boolean>): AsyncGenerator<T, void, unknown>;
/**
 * Stream map - transform each item in the stream
 */
declare function mapStream<T, U>(stream: AsyncIterable<T>, mapper: (item: T) => U | Promise<U>): AsyncGenerator<U, void, unknown>;

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
 * GitHub tarball streaming for Cloudflare Workers
 * Uses native DecompressionStream and lightweight tar parsing
 */

/**
 * Fetch all files from a GitHub tarball at once.
 * @deprecated Use streamGitHubFiles for better memory management.
 */
declare function fetchGitHubTarball(owner: string, repo: string, ref?: string, options?: {
    token?: string;
    extensions?: string[];
    excludeDirs?: string[];
    maxFiles?: number;
    onProgress?: (processed: number) => void;
}): Promise<FileContent[]>;

/**
 * Enhanced cache integration for Cloudflare Workers
 * Supports both Cache API and KV namespaces
 */

interface CacheOptions {
    cacheKey?: string;
    ttl?: number;
    cacheBehavior?: "force-cache" | "no-cache" | "default";
    namespace?: string;
}
interface CacheStorage {
    type: "cache-api" | "kv";
    instance: Cache | KVNamespace;
}
/**
 * Fetch from web with caching support
 */
declare function fetchFromWebCached(source: string, options?: FetchOptions & {
    cache?: CacheOptions;
}, cacheStorage?: CacheStorage): Promise<FetchResult | string>;
/**
 * Delete from cache
 */
declare function deleteFromCache(cacheStorage: CacheStorage, key: string): Promise<boolean>;
/**
 * Clear all cache entries matching a pattern
 */
declare function clearCache(cacheStorage: CacheStorage, pattern?: string): Promise<number>;
/**
 * Helper to create cache storage from Cloudflare bindings
 */
declare function createCacheStorage(cacheOrKV: Cache | KVNamespace): CacheStorage;
/**
 * Decorator to add caching to any async function
 */
declare function withCache<T extends (...args: any[]) => Promise<any>>(fn: T, getCacheKey: (...args: Parameters<T>) => string, ttl?: number): T;

/**
 * Migration helpers and compatibility layer for version changes
 */

/**
 * Migrate from old v1 result format to new format
 */
declare function migrateFromV1(oldResult: {
    root: any;
    url?: string;
    metadata?: any;
}): FetchResult;
/**
 * Compatibility layer for old API
 */
declare const compat: {
    /**
     * Legacy FetchResultImpl that maintains backward compatibility
     */
    FetchResultImpl: {
        new (root: FileNode | any, urlOrMetadata: string | any): {
            root: FileNode;
            url: string;
            result: FetchResult;
            /**
             * Legacy toMarkdown method
             */
            toMarkdown(): Promise<string>;
            /**
             * Get the modern FetchResult
             */
            toFetchResult(): FetchResult;
        };
    };
    /**
     * Legacy function signatures
     */
    fetchFromWeb(url: string, options?: any): Promise<any>;
    /**
     * Convert between old and new file formats
     */
    convertFileFormat(oldFile: any): FileContent;
    /**
     * Convert old options to new format
     */
    convertOptions(oldOptions: any): any;
};
/**
 * Migration guide generator
 */
declare function generateMigrationGuide(fromVersion: string, toVersion: string): string;
/**
 * Check if code needs migration
 */
declare function needsMigration(code: string): {
    needsMigration: boolean;
    issues: string[];
    suggestions: string[];
};
/**
 * Auto-migrate code (basic string replacements)
 */
declare function autoMigrateCode(code: string): string;

/**
 * Type guards and branded types for improved type safety
 */
type GitHubToken = string & {
    __brand: "GitHubToken";
};
type RepoPath = `${string}/${string}` & {
    __brand: "RepoPath";
};
type GitHubUrl = `https://github.com/${RepoPath}` & {
    __brand: "GitHubUrl";
};
type SemVer = `${number}.${number}.${number}` & {
    __brand: "SemVer";
};
/**
 * Type guard to check if a string is a valid GitHub URL
 */
declare function isValidGitHubUrl(url: string): url is GitHubUrl;
/**
 * Type guard to check if a string is a valid repository path
 */
declare function isValidRepoPath(path: string): path is RepoPath;
/**
 * Type guard to check if a token is a valid GitHub token format
 */
declare function isValidGitHubToken(token: string): token is GitHubToken;
/**
 * Type guard to check if a string is a valid semantic version
 */
declare function isValidSemVer(version: string): version is SemVer;
/**
 * Create a branded GitHub token (with validation)
 */
declare function createGitHubToken(token: string): GitHubToken;
/**
 * Create a branded repo path (with validation)
 */
declare function createRepoPath(owner: string, repo: string): RepoPath;
/**
 * Create a branded GitHub URL (with validation)
 */
declare function createGitHubUrl(owner: string, repo: string): GitHubUrl;
/**
 * Type guard for non-nullable values
 */
declare function isNotNull<T>(value: T | null | undefined): value is T;
/**
 * Type guard for arrays
 */
declare function isArray<T>(value: unknown): value is T[];
/**
 * Type guard for objects
 */
declare function isObject(value: unknown): value is Record<string, unknown>;
/**
 * Type guard for strings
 */
declare function isString(value: unknown): value is string;
/**
 * Type guard for numbers
 */
declare function isNumber(value: unknown): value is number;
/**
 * Assert that a value is defined (throws if not)
 */
declare function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T;
/**
 * Assert that a condition is true (throws if not)
 */
declare function assert(condition: unknown, message?: string): asserts condition;
/**
 * Exhaustive check for switch statements
 */
declare function exhaustiveCheck(value: never): never;

export { CacheError, type CacheOptions, type CacheStorage, type CodefetchConfig$1 as CodefetchConfig, CodefetchError, ConfigError, type CrawlOptions, type CrawlResult, type FetchMetadata, type FetchOptions, type FetchResult, FetchResultImpl, type FileContent, type FileNode, GitHubError, type GitHubToken, type GitHubUrl, type MarkdownFromContentOptions, NetworkError, type OutputFormat, ParseError, type PerformanceMetrics, type RepoPath, type SemVer, type StreamOptions, type TokenEncoder, TokenLimitError, type TokenLimiter, URLValidationError, VALID_ENCODERS, VALID_LIMITERS, VALID_PROMPTS, type WebFetchConfig, assert, assertDefined, autoMigrateCode, calculateTreeMetrics, clearCache, _default$3 as codegenPrompt, collectStream, compat, countTokens, createCacheStorage, createGitHubToken, createGitHubUrl, createMarkdownStream, createRepoPath, createTransformStream, deleteFromCache, detectLanguage, exhaustiveCheck, fetchFromWebWorker as fetchFromWeb, fetchFromWebCached, fetchGitHubTarball, filesToTree, filterStream, filterTree, findNodeByPath, _default$2 as fixPrompt, generateMarkdownFromContent, generateMigrationGuide, getCacheSizeLimit, getDefaultConfig, htmlToMarkdown, _default$1 as improvePrompt, isArray, isCloudflareWorker, isCodefetchError, isGitHubError, isNotNull, isNumber, isObject, isString, isTokenLimitError, isValidGitHubToken, isValidGitHubUrl, isValidRepoPath, isValidSemVer, mapStream, mergeWithCliArgs, migrateFromV1, needsMigration, prompts, resolveCodefetchConfig, sortTree, streamGitHubFiles, _default as testgenPrompt, treeToFiles, walkTree, withCache, wrapError };
