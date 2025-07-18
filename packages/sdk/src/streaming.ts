/**
 * Streaming API support for handling large repositories efficiently
 */

import type { FileContent } from "./markdown-content.js";
import type { MarkdownFromContentOptions } from "./markdown-content.js";
import { detectLanguage } from "./utils-browser.js";
import { countTokens } from "./token-counter.js";
import type { TokenEncoder } from "./types.js";

export interface StreamOptions {
  maxTokens?: number;
  tokenEncoder?: TokenEncoder;
  extensions?: string[];
  excludeDirs?: string[];
  includeTreeStructure?: boolean;
}

/**
 * Stream GitHub files as they're extracted from tarball
 * This is a generator function that yields files one by one
 */
export async function* streamGitHubFiles(
  owner: string,
  repo: string,
  options?: StreamOptions & { branch?: string; token?: string }
): AsyncGenerator<FileContent, void, unknown> {
  const { streamGitHubTarball } = await import("./web/github-tarball.js");

  const branch = options?.branch || "main";
  const extensions = options?.extensions || [];
  const excludeDirs = options?.excludeDirs || [];

  // Get the files from tarball
  const files = await streamGitHubTarball(owner, repo, branch, {
    token: options?.token,
    extensions,
    excludeDirs,
  });

  let totalTokens = 0;
  const maxTokens = options?.maxTokens || Infinity;
  const tokenEncoder = options?.tokenEncoder || "cl100k";

  for (const file of files) {
    // Count tokens
    const fileTokens = await countTokens(file.content || "", tokenEncoder);
    if (totalTokens + fileTokens > maxTokens) {
      // Stop if we would exceed token limit
      break;
    }

    totalTokens += fileTokens;

    // Yield the file
    yield {
      path: file.path,
      content: file.content || "",
      language: detectLanguage(file.path),
      size: file.content?.length || 0,
      tokens: fileTokens,
    };
  }
}

/**
 * Create a ReadableStream that generates markdown from files
 * This allows streaming markdown generation for large codebases
 */
export function createMarkdownStream(
  files: AsyncIterable<FileContent>,
  options?: MarkdownFromContentOptions
): ReadableStream<string> {
  return new ReadableStream({
    async start(controller) {
      try {
        // Write header
        const header = `# Code Repository\n\n`;
        controller.enqueue(header);

        // Optionally include tree structure
        if (options?.includeTreeStructure) {
          const treeHeader = `## Project Structure\n\n\`\`\`\n`;
          controller.enqueue(treeHeader);

          // Collect file paths for tree
          const paths: string[] = [];
          const fileArray: FileContent[] = [];

          for await (const file of files) {
            paths.push(file.path);
            fileArray.push(file);
          }

          // Generate tree structure
          const tree = generateTreeStructure(paths);
          controller.enqueue(tree);
          controller.enqueue("\n```\n\n");

          // Now process the collected files
          files = (async function* () {
            for (const file of fileArray) {
              yield file;
            }
          })();
        }

        // Stream file contents
        const filesHeader = `## Files\n\n`;
        controller.enqueue(filesHeader);

        for await (const file of files) {
          const fileHeader = `### ${file.path}\n\n`;
          controller.enqueue(fileHeader);

          const language = file.language || "text";
          const codeBlock = `\`\`\`${language}\n${
            options?.disableLineNumbers
              ? file.content
              : addLineNumbers(file.content)
          }\n\`\`\`\n\n`;

          controller.enqueue(codeBlock);
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * Stream processing with transform - allows processing files as they stream
 */
export function createTransformStream<T>(
  transform: (file: FileContent) => Promise<T> | T
): TransformStream<FileContent, T> {
  return new TransformStream({
    async transform(file, controller) {
      try {
        const result = await transform(file);
        controller.enqueue(result);
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * Helper to collect streamed files into an array
 */
export async function collectStream<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of stream) {
    results.push(item);
  }
  return results;
}

/**
 * Stream filter - only pass through files that match predicate
 */
export async function* filterStream<T>(
  stream: AsyncIterable<T>,
  predicate: (item: T) => boolean | Promise<boolean>
): AsyncGenerator<T, void, unknown> {
  for await (const item of stream) {
    if (await predicate(item)) {
      yield item;
    }
  }
}

/**
 * Stream map - transform each item in the stream
 */
export async function* mapStream<T, U>(
  stream: AsyncIterable<T>,
  mapper: (item: T) => U | Promise<U>
): AsyncGenerator<U, void, unknown> {
  for await (const item of stream) {
    yield await mapper(item);
  }
}

/**
 * Helper function to generate tree structure from paths
 */
function generateTreeStructure(paths: string[]): string {
  const tree: Record<string, any> = {};

  for (const path of paths) {
    const parts = path.split("/");
    let current = tree;

    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }

  function renderTree(
    node: Record<string, any>,
    prefix = "",
    _isLast = true
  ): string {
    let result = "";
    const entries = Object.entries(node);

    for (const [index, [name, children]] of entries.entries()) {
      const isLastEntry = index === entries.length - 1;
      const hasChildren = Object.keys(children).length > 0;

      result += prefix;
      result += isLastEntry ? "└── " : "├── ";
      result += name;
      result += hasChildren ? "/\n" : "\n";

      if (hasChildren) {
        const newPrefix = prefix + (isLastEntry ? "    " : "│   ");
        result += renderTree(children, newPrefix, isLastEntry);
      }
    }

    return result;
  }

  return renderTree(tree);
}

/**
 * Helper function to add line numbers to code
 */
function addLineNumbers(content: string): string {
  const lines = content.split("\n");
  const padLength = String(lines.length).length;

  return lines
    .map((line, index) => {
      const lineNum = String(index + 1).padStart(padLength, " ");
      return `${lineNum} | ${line}`;
    })
    .join("\n");
}
