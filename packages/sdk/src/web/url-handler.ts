import { URL } from "node:url";
import { isIPv4, isIPv6 } from "node:net";

// Git provider patterns
const GIT_PROVIDERS = {
  github: /^https:\/\/github\.com\/([\w-]+)\/([\w.-]+)/,
  gitlab: /^https:\/\/gitlab\.com\/([\w-]+)\/([\w.-]+)/,
  bitbucket: /^https:\/\/bitbucket\.org\/([\w-]+)\/([\w.-]+)/,
};

// Blocked patterns for security
const BLOCKED_PATTERNS = [
  /^file:\/\//i,
  /^ftp:\/\//i,
  /^ssh:\/\//i,
  /^telnet:\/\//i,
];

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const PRIVATE_IP_RANGES = [
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^169\.254\./, // 169.254.0.0/16 (link-local)
  /^fc00:/i, // IPv6 private
  /^fe80:/i, // IPv6 link-local
];

export interface ParsedURL {
  type: "git-repository";
  url: string;
  normalizedUrl: string;
  domain: string;
  path: string;
  gitProvider: keyof typeof GIT_PROVIDERS;
  gitOwner: string;
  gitRepo: string;
  gitRef?: string; // branch/tag/commit
}

export interface URLValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Normalize URL by adding protocol if missing
 */
function normalizeURLString(urlString: string): string {
  // If no protocol is specified, assume https://
  if (!/^[a-zA-Z]+:\/\//.test(urlString)) {
    return `https://${urlString}`;
  }
  return urlString;
}

/**
 * Validates a URL for security and format
 */
export function validateURL(urlString: string): URLValidationResult {
  try {
    // Normalize URL first
    const normalizedUrlString = normalizeURLString(urlString);
    const url = new URL(normalizedUrlString);

    // Check protocol
    if (!["http:", "https:"].includes(url.protocol)) {
      return {
        valid: false,
        error: `Invalid protocol: ${url.protocol}. Only HTTP and HTTPS are allowed.`,
      };
    }

    // Check for blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(urlString)) {
        return { valid: false, error: "URL contains blocked pattern" };
      }
    }

    // Check hostname
    const hostname = url.hostname.toLowerCase();

    // Check for blocked hosts
    if (BLOCKED_HOSTS.has(hostname)) {
      return { valid: false, error: `Blocked hostname: ${hostname}` };
    }

    // Check if it's an IP address
    if (isIPv4(hostname) || isIPv6(hostname)) {
      // Check for private IP ranges
      for (const range of PRIVATE_IP_RANGES) {
        if (range.test(hostname)) {
          return {
            valid: false,
            error: `Private IP address not allowed: ${hostname}`,
          };
        }
      }
    }

    // Additional security: check for suspicious patterns
    // Note: URL constructor normalizes paths, so we need to check the original string
    if (hostname.includes("..") || urlString.includes("..")) {
      return {
        valid: false,
        error: "URL contains suspicious path traversal patterns",
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid URL format: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Detects if a URL is a git repository
 */
export function detectGitProvider(
  urlString: string
): keyof typeof GIT_PROVIDERS | null {
  for (const [provider, pattern] of Object.entries(GIT_PROVIDERS)) {
    if (pattern.test(urlString)) {
      return provider as keyof typeof GIT_PROVIDERS;
    }
  }
  return null;
}

/**
 * Parses and normalizes a URL
 */
export function parseURL(urlString: string): ParsedURL | null {
  // Normalize URL first
  const normalizedUrlString = normalizeURLString(urlString);

  const validation = validateURL(urlString);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const url = new URL(normalizedUrlString);
  const gitProvider = detectGitProvider(normalizedUrlString);

  if (!gitProvider) {
    throw new Error(
      "Only GitHub, GitLab, and Bitbucket repository URLs are supported. " +
      "Please provide a valid git repository URL (e.g., https://github.com/owner/repo)"
    );
  }

  // Parse git repository URL
  const match = normalizedUrlString.match(GIT_PROVIDERS[gitProvider]);
  if (!match) {
    throw new Error("Failed to parse git repository URL");
  }

  const [, owner, repo] = match;
  let gitRef: string | undefined;

  // Extract branch/tag/commit from URL path
  // e.g., /owner/repo/tree/branch or /owner/repo/commit/sha
  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts.length > 2) {
    const refType = pathParts[2]; // 'tree', 'commit', 'blob', etc.
    if (["tree", "commit", "blob"].includes(refType) && pathParts[3]) {
      gitRef = pathParts.slice(3).join("/");
    } else if (
      pathParts[2] === "releases" &&
      pathParts[3] === "tag" &&
      pathParts[4]
    ) {
      gitRef = pathParts[4];
    }
  }

  // Normalize repository URL (remove .git suffix if present)
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
    gitRef,
  };
}

/**
 * Extracts base domain from URL for caching
 */
export function extractCacheKey(parsedUrl: ParsedURL): string {
  const ref = parsedUrl.gitRef || "default";
  return `${parsedUrl.gitProvider}-${parsedUrl.gitOwner}-${parsedUrl.gitRepo}-${ref}`;
}

