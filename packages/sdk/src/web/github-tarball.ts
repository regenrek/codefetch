/**
 * GitHub tarball streaming for Cloudflare Workers
 * Uses native DecompressionStream and lightweight tar parsing
 */

import type { FileContent } from "../markdown-content.js";

interface TarHeader {
  name: string;
  size: number;
  type: string;
}

/**
 * Simple TAR parser that works with streams
 * Parses TAR format block by block
 */
class TarStreamParser {
  private buffer = new Uint8Array(0);
  private position = 0;

  async *parse(
    stream: ReadableStream<Uint8Array>
  ): AsyncGenerator<{ header: TarHeader; body: Uint8Array }> {
    const reader = stream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append new data to buffer
        const newBuffer = new Uint8Array(this.buffer.length + value.length);
        newBuffer.set(this.buffer);
        newBuffer.set(value, this.buffer.length);
        this.buffer = newBuffer;

        // Process complete blocks (512 bytes each)
        while (this.buffer.length >= 512) {
          // Check if this is an empty block (end of archive)
          const block = this.buffer.slice(0, 512);
          if (this.isEmptyBlock(block)) {
            this.buffer = this.buffer.slice(512);
            continue;
          }

          // Parse header
          const header = this.parseHeader(block);
          if (!header) {
            this.buffer = this.buffer.slice(512);
            continue;
          }

          // Calculate padded size (TAR uses 512-byte blocks)
          const paddedSize = Math.ceil(header.size / 512) * 512;
          const totalSize = 512 + paddedSize; // header + padded content

          // Wait for enough data
          if (this.buffer.length < totalSize) {
            break;
          }

          // Extract file content
          const body = this.buffer.slice(512, 512 + header.size);

          // Yield file entry
          if (header.type === "0" || header.type === "") {
            // Regular file
            yield { header, body };
          }

          // Move to next entry
          this.buffer = this.buffer.slice(totalSize);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private isEmptyBlock(block: Uint8Array): boolean {
    return block.every((byte) => byte === 0);
  }

  private parseHeader(block: Uint8Array): TarHeader | null {
    // TAR header format (simplified)
    const name = this.readString(block, 0, 100);
    if (!name) return null;

    const sizeStr = this.readString(block, 124, 12);
    const size = parseInt(sizeStr, 8); // Octal

    const typeFlag = String.fromCharCode(block[156]);

    return {
      name: name.replace(/\0+$/, ""), // Remove null padding
      size,
      type: typeFlag,
    };
  }

  private readString(
    block: Uint8Array,
    offset: number,
    length: number
  ): string {
    const bytes = block.slice(offset, offset + length);
    const nullIndex = bytes.indexOf(0);
    const effectiveLength = nullIndex === -1 ? length : nullIndex;
    return new TextDecoder().decode(bytes.slice(0, effectiveLength));
  }
}

/**
 * Stream and process GitHub tarball
 */
export async function streamGitHubTarball(
  owner: string,
  repo: string,
  ref: string = "HEAD",
  options: {
    token?: string;
    extensions?: string[];
    excludeDirs?: string[];
    maxFiles?: number;
    onProgress?: (processed: number) => void;
  } = {}
): Promise<FileContent[]> {
  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/${ref}`;

  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3.tarball",
    "User-Agent": "codefetch-worker",
  };

  if (options.token) {
    headers["Authorization"] = `token ${options.token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository not found: ${owner}/${repo}`);
    } else if (response.status === 403) {
      throw new Error("API rate limit exceeded or authentication required");
    }
    throw new Error(
      `Failed to fetch tarball: ${response.status} ${response.statusText}`
    );
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  // Stream decompress gzip
  const decompressedStream = response.body.pipeThrough(
    new DecompressionStream("gzip")
  );

  // Parse TAR format
  const parser = new TarStreamParser();
  const files: FileContent[] = [];

  // Default exclusions
  const defaultExcludeDirs = [
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage",
  ];
  const excludeDirs = [...(options.excludeDirs || []), ...defaultExcludeDirs];

  let processed = 0;
  let rootPrefix = "";

  for await (const { header, body } of parser.parse(decompressedStream)) {
    // Detect and remove root directory prefix (GitHub adds repo-ref/ prefix)
    if (!rootPrefix && header.name.includes("/")) {
      rootPrefix = header.name.split("/")[0] + "/";
    }

    const relativePath = header.name.startsWith(rootPrefix)
      ? header.name.slice(rootPrefix.length)
      : header.name;

    if (!relativePath) continue;

    // Check exclusions
    const pathParts = relativePath.split("/");
    const isExcluded = excludeDirs.some((dir) => pathParts.includes(dir));
    if (isExcluded) continue;

    // Check extensions
    if (options.extensions && options.extensions.length > 0) {
      const hasValidExt = options.extensions.some((ext) =>
        relativePath.endsWith(ext)
      );
      if (!hasValidExt) continue;
    }

    // Check file limit
    if (options.maxFiles && processed >= options.maxFiles) {
      break;
    }

    // Convert body to string
    const content = new TextDecoder().decode(body);

    files.push({
      path: relativePath,
      content,
    });

    processed++;
    if (options.onProgress) {
      options.onProgress(processed);
    }
  }

  return files;
}

/**
 * Alternative: Use tar-stream library if available
 * This would replace the TarStreamParser above
 */
export async function streamGitHubTarballWithLibrary(
  owner: string,
  repo: string,
  ref: string = "HEAD",
  options: {
    token?: string;
    extensions?: string[];
    excludeDirs?: string[];
    maxFiles?: number;
  } = {}
): Promise<FileContent[]> {
  // This is a placeholder for when using @dorasque/tar or similar
  // The library would handle the TAR parsing more robustly

  // Example with hypothetical tar-stream library:
  /*
  const tarStream = await import('tar-stream');
  const extract = tarStream.extract();
  
  const files: FileContent[] = [];
  
  extract.on('entry', (header, stream, next) => {
    if (header.type === 'file') {
      const chunks: Uint8Array[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        const content = new TextDecoder().decode(Buffer.concat(chunks));
        files.push({ path: header.name, content });
        next();
      });
    } else {
      stream.resume();
      next();
    }
  });
  
  decompressedStream.pipeTo(extract);
  */

  throw new Error("Library-based implementation not yet available");
}
