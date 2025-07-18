/**
 * Example: Using native DecompressionStream in Cloudflare Workers
 *
 * This example demonstrates why DecompressionStream is superior to node:zlib:
 * - No nodejs_compat flag needed
 * - 0 KB bundle overhead (vs ~45 KB for node:zlib polyfills)
 * - Native V8 performance
 * - Works in both Workers and browsers
 */

import { fetchGitHubTarball } from "codefetch-sdk/worker";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Example: /extract?owner=microsoft&repo=vscode&ref=main
    const owner = url.searchParams.get("owner") || "microsoft";
    const repo = url.searchParams.get("repo") || "vscode";
    const ref = url.searchParams.get("ref") || "main";

    const files: Array<{
      path: string;
      size: number;
      preview: string;
    }> = [];

    try {
      await fetchGitHubTarball(
        {
          owner,
          repo,
          ref,
          extensions: [".ts", ".js", ".json", ".md"],
          maxFileSize: 100_000, // 100KB max per file
        },
        async (file) => {
          files.push({
            path: file.path,
            size: file.size,
            preview: file.content.slice(0, 200) + "...",
          });
        }
      );

      return Response.json(
        {
          success: true,
          repo: `${owner}/${repo}`,
          ref,
          fileCount: files.length,
          totalSize: files.reduce((sum, f) => sum + f.size, 0),
          // Show first 10 files
          files: files.slice(0, 10),
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600", // Cache for 1 hour
          },
        }
      );
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};

/**
 * Performance comparison:
 *
 * DecompressionStream approach:
 * - Cold start: ~50ms (no extra modules)
 * - Memory: Minimal (streaming)
 * - Bundle: 0 KB overhead
 *
 * node:zlib approach:
 * - Cold start: ~150ms (loading polyfills)
 * - Memory: Higher (polyfill overhead)
 * - Bundle: ~45 KB overhead
 *
 * For a 10MB tarball:
 * - Both decompress at similar speeds
 * - DecompressionStream has better memory efficiency
 * - No compatibility date requirements
 */
