/**
 * Type guards and branded types for improved type safety
 */

// Branded types for additional type safety
export type GitHubToken = string & { __brand: "GitHubToken" };
export type RepoPath = `${string}/${string}` & { __brand: "RepoPath" };
export type GitHubUrl = `https://github.com/${RepoPath}` & {
  __brand: "GitHubUrl";
};
export type SemVer = `${number}.${number}.${number}` & { __brand: "SemVer" };

/**
 * Type guard to check if a string is a valid GitHub URL
 */
export function isValidGitHubUrl(url: string): url is GitHubUrl {
  const pattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(?:\/.*)?$/;
  return pattern.test(url);
}

/**
 * Type guard to check if a string is a valid repository path
 */
export function isValidRepoPath(path: string): path is RepoPath {
  const pattern = /^[\w-]+\/[\w.-]+$/;
  return pattern.test(path);
}

/**
 * Type guard to check if a token is a valid GitHub token format
 */
export function isValidGitHubToken(token: string): token is GitHubToken {
  // GitHub tokens can be:
  // - Classic: 40 character hex
  // - Fine-grained: ghp_ prefix
  // - Installation: ghs_ prefix
  // - OAuth: gho_ prefix
  const patterns = [
    /^[a-f0-9]{40}$/, // Classic token
    /^ghp_[a-zA-Z0-9]{36}$/, // Fine-grained personal access token
    /^ghs_[a-zA-Z0-9]{36}$/, // GitHub App installation access token
    /^gho_[a-zA-Z0-9]{36}$/, // OAuth access token
  ];

  return patterns.some((pattern) => pattern.test(token));
}

/**
 * Type guard to check if a string is a valid semantic version
 */
export function isValidSemVer(version: string): version is SemVer {
  const pattern = /^\d+\.\d+\.\d+$/;
  return pattern.test(version);
}

/**
 * Create a branded GitHub token (with validation)
 */
export function createGitHubToken(token: string): GitHubToken {
  if (!isValidGitHubToken(token)) {
    throw new Error(`Invalid GitHub token format`);
  }
  return token as GitHubToken;
}

/**
 * Create a branded repo path (with validation)
 */
export function createRepoPath(owner: string, repo: string): RepoPath {
  const path = `${owner}/${repo}`;
  if (!isValidRepoPath(path)) {
    throw new Error(`Invalid repository path: ${path}`);
  }
  return path as RepoPath;
}

/**
 * Create a branded GitHub URL (with validation)
 */
export function createGitHubUrl(owner: string, repo: string): GitHubUrl {
  const url = `https://github.com/${owner}/${repo}`;
  if (!isValidGitHubUrl(url)) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }
  return url as GitHubUrl;
}

/**
 * Type guard for non-nullable values
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for arrays
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard for objects
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard for strings
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type guard for numbers
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Assert that a value is defined (throws if not)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || "Value is null or undefined");
  }
}

/**
 * Assert that a condition is true (throws if not)
 */
export function assert(
  condition: unknown,
  message?: string
): asserts condition {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

/**
 * Exhaustive check for switch statements
 */
export function exhaustiveCheck(value: never): never {
  throw new Error(`Unhandled case: ${value}`);
}
