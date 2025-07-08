import { sep } from "node:path";

/**
 * Normalize path separators to forward slashes for cross-platform compatibility
 * This is especially useful in tests where we need consistent path representations
 */
export function normalizePathSeparators(path: string): string {
  return path.replace(/\\/g, "/");
}

/**
 * Convert path to use platform-specific separators
 */
export function toPlatformPath(path: string): string {
  return path.replace(/[/\\]/g, sep);
}
