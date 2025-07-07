/**
 * Runtime environment detection for Cloudflare Workers
 */

/**
 * Detect if code is running in a Cloudflare Worker environment
 * Workers have WebSocketPair but no __dirname in globalThis
 */
export const isCloudflareWorker =
  typeof (globalThis as any).WebSocketPair !== "undefined" && 
  !("__dirname" in globalThis);

/**
 * Get environment-specific cache size limit in bytes
 */
export const getCacheSizeLimit = (): number => {
  // Workers have ~10MB TmpFS, use 8MB to leave headroom
  if (isCloudflareWorker) {
    return 8 * 1024 * 1024; // 8 MB
  }
  // Node.js default: 100 MB
  return 100 * 1024 * 1024;
};

/**
 * Check if git operations are available in current environment
 */
export const isGitAvailable = (): boolean => {
  return !isCloudflareWorker;
};