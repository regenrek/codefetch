/**
 * Example: Using streamGitHubTarball in Cloudflare Workers
 *
 * This demonstrates the optimized GitHub tarball extraction:
 * - Native DecompressionStream (0 KB bundle overhead)
 * - Custom lightweight TAR parser
 * - No nodejs_compat flag needed
 * - Pure Web Streams implementation
 */

import { streamGitHubTarball } from "codefetch-sdk/worker";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Example: /extract?owner=microsoft&repo=vscode&ref=main
    const owner = url.searchParams.get("owner") || "microsoft";
    const repo = url.searchParams.get("repo") || "vscode";
    const ref = url.searchParams.get("ref") || "main";
    const token = url.searchParams.get("token"); // Optional GitHub token

    try {
      // Stream and extract files from GitHub tarball
      const files = await streamGitHubTarball(owner, repo, ref, {
        token: token || undefined,
        extensions: [".ts", ".js", ".json", ".md"], // Filter by extension
        excludeDirs: ["node_modules", ".git"], // Exclude directories
        maxFiles: 100, // Limit number of files
        onProgress: (processed) => {
          console.log(`Processed ${processed} files...`);
        },
      });

      // Transform results for response
      const results = files.map((file) => ({
        path: file.path,
        size: file.content.length,
        language: file.language,
        preview:
          file.content.slice(0, 200) + (file.content.length > 200 ? "..." : ""),
      }));

      return Response.json(
        {
          success: true,
          repo: `${owner}/${repo}`,
          ref,
          fileCount: files.length,
          totalSize: files.reduce((sum, f) => sum + f.content.length, 0),
          files: results.slice(0, 10), // First 10 files
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
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
 * Performance characteristics:
 *
 * - Bundle size: 0 KB extra (uses existing SDK code)
 * - Cold start: Minimal (no extra dependencies)
 * - Memory: Efficient streaming (doesn't load entire tarball)
 * - Speed: Native DecompressionStream performance
 *
 * The custom TAR parser is optimized for:
 * - Streaming large repositories
 * - Filtering files during extraction
 * - Memory-efficient processing
 */
