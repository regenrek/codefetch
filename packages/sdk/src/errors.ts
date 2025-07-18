/**
 * Custom error classes for better error handling and debugging
 */

/**
 * Base error class for all Codefetch errors
 */
export class CodefetchError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "CodefetchError";
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when GitHub API requests fail
 */
export class GitHubError extends CodefetchError {
  constructor(
    message: string,
    public status: number,
    public rateLimitRemaining?: number,
    public rateLimitReset?: Date
  ) {
    super(message, "GITHUB_ERROR");
    this.name = "GitHubError";
  }
}

/**
 * Error thrown when token limit is exceeded
 */
export class TokenLimitError extends CodefetchError {
  constructor(
    public limit: number,
    public used: number,
    public files: string[]
  ) {
    super(`Token limit exceeded: ${used}/${limit} tokens used`, "TOKEN_LIMIT");
    this.name = "TokenLimitError";
  }
}

/**
 * Error thrown when parsing files or content fails
 */
export class ParseError extends CodefetchError {
  constructor(
    message: string,
    public filePath: string,
    public line?: number,
    public column?: number
  ) {
    super(message, "PARSE_ERROR");
    this.name = "ParseError";
  }
}

/**
 * Error thrown when network requests fail
 */
export class NetworkError extends CodefetchError {
  constructor(
    message: string,
    public url: string,
    public cause?: Error
  ) {
    super(message, "NETWORK_ERROR");
    this.name = "NetworkError";
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigError extends CodefetchError {
  constructor(
    message: string,
    public configPath?: string,
    public invalidField?: string
  ) {
    super(message, "CONFIG_ERROR");
    this.name = "ConfigError";
  }
}

/**
 * Error thrown when cache operations fail
 */
export class CacheError extends CodefetchError {
  constructor(
    message: string,
    public operation: "read" | "write" | "delete",
    public key?: string
  ) {
    super(message, "CACHE_ERROR");
    this.name = "CacheError";
  }
}

/**
 * Error thrown when URL validation fails
 */
export class URLValidationError extends CodefetchError {
  constructor(
    message: string,
    public url: string,
    public reason: string
  ) {
    super(message, "URL_VALIDATION_ERROR");
    this.name = "URLValidationError";
  }
}

/**
 * Type guard to check if an error is a CodefetchError
 */
export function isCodefetchError(error: unknown): error is CodefetchError {
  return error instanceof CodefetchError;
}

/**
 * Type guard to check if an error is a GitHubError
 */
export function isGitHubError(error: unknown): error is GitHubError {
  return error instanceof GitHubError;
}

/**
 * Type guard to check if an error is a TokenLimitError
 */
export function isTokenLimitError(error: unknown): error is TokenLimitError {
  return error instanceof TokenLimitError;
}

/**
 * Helper to wrap unknown errors in a CodefetchError
 */
export function wrapError(
  error: unknown,
  code: string = "UNKNOWN_ERROR"
): CodefetchError {
  if (error instanceof CodefetchError) {
    return error;
  }

  if (error instanceof Error) {
    const wrappedError = new CodefetchError(error.message, code);
    wrappedError.stack = error.stack;
    return wrappedError;
  }

  return new CodefetchError(String(error), code);
}
