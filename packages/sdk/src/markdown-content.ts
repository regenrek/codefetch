/**
 * Worker-compatible markdown generation from file content objects
 */

import { countTokens } from "./token-counter.js";
import { detectLanguage } from "./utils.js";
import type { TokenEncoder } from "./types.js";

export interface FileContent {
  path: string;
  content: string;
}

export interface MarkdownFromContentOptions {
  maxTokens?: number;
  includeTreeStructure?: boolean;
  tokenEncoder?: TokenEncoder;
  disableLineNumbers?: boolean;
}

/**
 * Generate markdown from file content objects (Worker-compatible)
 * This function doesn't require filesystem access
 */
export async function generateMarkdownFromContent(
  files: FileContent[],
  options: MarkdownFromContentOptions = {}
): Promise<string> {
  const {
    maxTokens,
    includeTreeStructure = false,
    tokenEncoder = "cl100k",
    disableLineNumbers = false,
  } = options;

  let markdown = "";
  let totalTokens = 0;

  // Add tree structure if requested
  if (includeTreeStructure) {
    markdown += "# Project Structure\n\n```\n";
    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

    const tree = new Map<string, string[]>();
    for (const file of sortedFiles) {
      const parts = file.path.split("/");
      const fileName = parts.pop()!;
      const dir = parts.join("/") || ".";

      if (!tree.has(dir)) {
        tree.set(dir, []);
      }
      tree.get(dir)!.push(fileName);
    }

    for (const [dir, fileNames] of tree) {
      if (dir !== ".") {
        markdown += `${dir}/\n`;
      }
      for (const fileName of fileNames) {
        const indent = dir === "." ? "" : "  ";
        markdown += `${indent}${fileName}\n`;
      }
    }

    markdown += "```\n\n";
  }

  // Add file contents
  markdown += "# File Contents\n\n";

  for (const file of files) {
    if (maxTokens && totalTokens >= maxTokens) {
      markdown += `\n... Remaining files truncated due to token limit (${maxTokens}) ...\n`;
      break;
    }

    const language = detectLanguage(file.path);
    const lines = file.content.split("\n");

    markdown += `## ${file.path}\n\n`;
    markdown += `\`\`\`${language}\n`;

    if (disableLineNumbers) {
      markdown += file.content;
    } else {
      // Add line numbers
      const paddingWidth = Math.max(4, lines.length.toString().length + 1);
      for (const [i, line] of lines.entries()) {
        const lineNumber = (i + 1).toString().padStart(paddingWidth, " ");
        markdown += `${lineNumber} ${line}\n`;
      }
    }

    markdown += "\n```\n\n";

    // Update token count
    const fileTokens = await countTokens(markdown, tokenEncoder);
    totalTokens = fileTokens;

    if (maxTokens && totalTokens > maxTokens) {
      // Truncate the last file if it exceeds the limit
      const excess = totalTokens - maxTokens;
      const approximateCharsPerToken = 4; // rough estimate
      const charsToRemove = excess * approximateCharsPerToken;

      markdown = markdown.slice(0, -charsToRemove);
      markdown += "\n... File truncated due to token limit ...\n```\n\n";
      break;
    }
  }

  return markdown.trim();
}
