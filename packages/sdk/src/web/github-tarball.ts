/**
 * GitHub tarball streaming for Cloudflare Workers
 * Uses native DecompressionStream and lightweight tar parsing
 */

import type { FileContent } from "../markdown-content.js";
import { TarStreamParser } from "./tar-parser.js";

/**
 * Fetch GitHub repository as tarball and return buffer.
 * @deprecated Use streamGitHubFiles for better memory management.
 */
export async function fetchGitHubTarball(
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

  const headers: Record<string, string> = {
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

  const files: FileContent[] = [];

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
 * Stream and process GitHub tarball, yielding files one by one.
 */
export async function* streamGitHubFiles(
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
): AsyncGenerator<FileContent, void, undefined> {
  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/${ref}`;

  const headers: Record<string, string> = {
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

    yield {
      path: relativePath,
      content,
    };

    processed++;
    if (options.onProgress) {
      options.onProgress(processed);
    }
  }
}

/**
 * Alternative: Use tar-stream library if available
 * This would replace the TarStreamParser above
 */
export async function streamGitHubTarballWithLibrary(
  owner: string,
  repo: string,
  _ref: string = "HEAD",
  _options: {
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
