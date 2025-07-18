/**
 * GitHub Tarball extraction for Cloudflare Workers
 * Uses native DecompressionStream (no nodejs_compat needed)
 *
 * This demonstrates the optimal pattern for extracting GitHub tarballs in Workers:
 * - DecompressionStream for gzip (0 KB extra, native runtime support)
 * - tar-stream for parsing (works with adapters)
 * - Streaming processing (stays under 128 MB limit)
 */

import { extract, type Extract, type Headers } from "tar-stream";

/**
 * Simple Web Streams to Node Streams adapter for tar-stream
 * This creates a minimal polyfill that tar-stream can understand
 */
function createNodeStreamAdapter(webStream: ReadableStream) {
  const reader = webStream.getReader();
  let destroyed = false;

  // Create a minimal Node.js-compatible stream object
  const nodeStream = {
    readable: true,
    destroyed: false,

    async pipe(destination: any) {
      try {
        while (!destroyed) {
          const { done, value } = await reader.read();
          if (done) {
            if (destination.end) destination.end();
            break;
          }
          if (destination.write) {
            destination.write(value);
          }
        }
      } catch (error) {
        if (destination.destroy) {
          destination.destroy(error);
        }
      }
      return destination;
    },

    destroy(error?: Error) {
      destroyed = true;
      reader.cancel(error);
    },

    on(event: string, listener: Function) {
      // Basic event emitter functionality
      if (event === "error" && !destroyed) {
        // Handle errors during reading
        reader.read().catch((error) => listener(error));
      }
      return this;
    },
  };

  return nodeStream;
}

/**
 * Configuration for GitHub tarball fetching
 */
export interface GitHubTarballConfig {
  owner: string;
  repo: string;
  ref?: string; // branch, tag, or commit SHA (default: 'HEAD')
  /** File extensions to process */
  extensions?: string[];
  /** Maximum file size to process (default: 512KB) */
  maxFileSize?: number;
}

/**
 * File handler callback
 */
export type FileHandler = (file: {
  path: string;
  content: string;
  size: number;
}) => Promise<void> | void;

/**
 * Fetch and extract files from a GitHub repository tarball
 *
 * @example
 * ```ts
 * const files = [];
 * await fetchGitHubTarball({
 *   owner: 'microsoft',
 *   repo: 'vscode',
 *   ref: 'main',
 *   extensions: ['.ts', '.js', '.json', '.md']
 * }, async (file) => {
 *   files.push(file);
 *   // Or store in R2, convert to markdown, etc.
 * });
 * ```
 */
export async function fetchGitHubTarball(
  config: GitHubTarballConfig,
  onFile: FileHandler
): Promise<void> {
  const {
    owner,
    repo,
    ref = "HEAD",
    extensions = [],
    maxFileSize = 512_000,
  } = config;

  // Fetch the tarball from GitHub
  const tarGzResponse = await fetch(
    `https://codeload.github.com/${owner}/${repo}/tar.gz/${ref}`
  );

  if (!tarGzResponse.ok) {
    throw new Error(
      `GitHub fetch failed: ${tarGzResponse.status} ${tarGzResponse.statusText}`
    );
  }

  if (!tarGzResponse.body) {
    throw new Error("Response body is null");
  }

  // Native decompression - no nodejs_compat needed!
  const decompressed = tarGzResponse.body.pipeThrough(
    new DecompressionStream("gzip")
  );

  // Create tar extractor
  const tarExtractor = extract();

  // Handle each file entry
  tarExtractor.on(
    "entry",
    async (
      header: Headers,
      stream: NodeJS.ReadableStream,
      next: () => void
    ) => {
      const shouldProcess =
        header.type === "file" &&
        header.size !== null &&
        header.size !== undefined &&
        header.size > 0 &&
        header.size <= maxFileSize &&
        (extensions.length === 0 ||
          extensions.some((ext) => header.name.endsWith(ext)));

      if (shouldProcess && header.size > 0) {
        const chunks: Uint8Array[] = [];

        stream.on("data", (chunk: Buffer | Uint8Array) => {
          chunks.push(chunk instanceof Buffer ? new Uint8Array(chunk) : chunk);
        });

        stream.on("end", async () => {
          try {
            const buffer = new Uint8Array(
              chunks.reduce((acc, chunk) => acc + chunk.length, 0)
            );
            let offset = 0;
            for (const chunk of chunks) {
              buffer.set(chunk, offset);
              offset += chunk.length;
            }

            const content = new TextDecoder().decode(buffer);
            await onFile({
              path: header.name,
              content,
              size: header.size as number,
            });
          } catch (error) {
            console.error(`Error processing ${header.name}:`, error);
          }
          next();
        });
      } else {
        // Skip this file
        stream.on("end", next);
        stream.resume();
      }

      stream.on("error", (error: Error) => {
        console.error(`Stream error for ${header.name}:`, error);
        next();
      });
    }
  );

  // Convert Web Stream to Node Stream and pipe to tar extractor
  const nodeStream = createNodeStreamAdapter(decompressed);
  (nodeStream as any).pipe(tarExtractor);

  // Wait for extraction to complete
  return new Promise((resolve, reject) => {
    tarExtractor.on("finish", resolve);
    tarExtractor.on("error", reject);
    nodeStream.on("error", reject);
  });
}

/**
 * Minimal Cloudflare Worker example
 */
export const workerExample = `
export default {
  async fetch(request: Request): Promise<Response> {
    const { owner, repo, ref = 'main' } = await request.json();
    
    const files: Array<{ path: string; size: number }> = [];
    
    await fetchGitHubTarball({
      owner,
      repo,
      ref,
      extensions: ['.ts', '.js', '.py', '.md']
    }, async (file) => {
      files.push({ path: file.path, size: file.size });
      // Process file: store in R2, convert to markdown, etc.
    });
    
    return Response.json({ 
      message: 'Extraction complete',
      fileCount: files.length,
      files: files.slice(0, 10) // First 10 files
    });
  }
};
`;
