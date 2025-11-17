/**
 * GitLab tarball streaming for Cloudflare Workers
 * Uses native DecompressionStream and lightweight tar parsing
 */

import type { FileContent } from "../markdown-content.js";
import { TarStreamParser } from "./tar-parser.js";

/**
 * Stream files from a GitLab repository tarball.
 */
export async function* streamGitLabFiles(
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
  // Encode the project path for GitLab API
  const projectPath = encodeURIComponent(`${owner}/${repo}`);
  const url = `https://gitlab.com/api/v4/projects/${projectPath}/repository/archive.tar.gz?sha=${ref}`;

  const headers: Record<string, string> = {
    "User-Agent": "codefetch-worker",
  };

  if (options.token) {
    headers["PRIVATE-TOKEN"] = options.token;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    switch (response.status) {
      case 404: {
        throw new Error(`Repository not found: ${owner}/${repo}`);
      }
      case 401: {
        throw new Error("Authentication required for private repository");
      }
      case 403: {
        throw new Error("Access forbidden - check your GitLab token");
      }
      default: {
        throw new Error(
          `Failed to fetch GitLab tarball: ${response.status} ${response.statusText}`
        );
      }
    }
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
    // Detect and remove root directory prefix (GitLab adds project-ref/ prefix)
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
