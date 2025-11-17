// URL is globally available in browsers and Workers, no import needed
// Simple IP validation functions to replace node:net

function isIPv4(str: string): boolean {
  const parts = str.split(".");
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    const num = Number.parseInt(part, 10);
    return (
      !Number.isNaN(num) && num >= 0 && num <= 255 && part === num.toString()
    );
  });
}

function isIPv6(str: string): boolean {
  // Basic IPv6 validation
  const parts = str.split(":");
  if (parts.length < 3 || parts.length > 8) return false;

  // Check for valid hex values
  const hexPattern = /^[0-9a-fA-F]{0,4}$/;
  return parts.every((part) => hexPattern.test(part));
}

// Git provider patterns keyed by domain
const GIT_PROVIDERS = {
  "github.com": {
    type: "github",
    patterns: [
      /^(?:https?:\/\/)?github\.com\/([^/]+)\/([^/\s]+?)(?:\.git)?(?:\/tree\/([^/\s]+))?(?:\/.*)?$/,
    ],
  },
  "gitlab.com": {
    type: "gitlab",
    patterns: [
      /^(?:https?:\/\/)?gitlab\.com\/([^/]+)\/([^/\s]+?)(?:\.git)?(?:\/-\/tree\/([^/\s]+))?(?:\/.*)?$/,
      // Also support nested groups
      /^(?:https?:\/\/)?gitlab\.com\/((?:[^/]+\/)+)([^/\s]+?)(?:\.git)?(?:\/-\/tree\/([^/\s]+))?(?:\/.*)?$/,
    ],
  },
} as const;

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
  /**
   * Logical git provider identifier (e.g. "github" | "gitlab")
   */
  gitProvider: "github" | "gitlab";
  /**
   * Full host/domain of the provider (e.g. "github.com")
   */
  gitHost: keyof typeof GIT_PROVIDERS;
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
 * Parses and normalizes a URL
 */
export function parseURL(urlString: string): ParsedURL | null {
  const validation = validateURL(urlString);
  if (!validation.valid) {
    return null;
  }

  const normalizedUrl = normalizeURLString(urlString);

  try {
    const url = new URL(normalizedUrl);
    const domain = url.hostname.toLowerCase();
    const pathname = url.pathname;

    // Check git providers
    for (const [providerDomain, providerInfo] of Object.entries(
      GIT_PROVIDERS
    )) {
      if (domain === providerDomain) {
        for (const pattern of providerInfo.patterns) {
          const match = normalizedUrl.match(pattern);
          if (match) {
            let gitOwner = match[1];
            let gitRepo = match[2];
            const gitRef = match[3] || undefined;

            // Handle GitLab nested groups
            if (providerInfo.type === "gitlab" && gitOwner.endsWith("/")) {
              // Remove trailing slash from nested groups
              gitOwner = gitOwner.slice(0, -1);
            }

            // Clean up repo name
            gitRepo = gitRepo.replace(/\.git$/, "");

            return {
              type: "git-repository",
              url: normalizedUrl,
              normalizedUrl,
              domain,
              path: pathname,
              gitProvider: providerInfo.type,
              gitHost: providerDomain as keyof typeof GIT_PROVIDERS,
              gitOwner,
              gitRepo,
              gitRef,
            };
          }
        }
      }
    }

    // If not a git provider, return null for now
    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts base domain from URL for caching
 */
export function extractCacheKey(parsedUrl: ParsedURL): string {
  const ref = parsedUrl.gitRef || "default";
  // Use logical provider id ("github" / "gitlab") in cache key for stability
  return `${parsedUrl.gitProvider}-${parsedUrl.gitOwner}-${parsedUrl.gitRepo}-${ref}`;
}
