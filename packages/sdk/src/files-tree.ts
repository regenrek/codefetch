import { readFile, stat } from "node:fs/promises";
import path from "pathe";
import type { FileNode, TokenEncoder } from "./types";
import { countTokens } from "./token-counter";
import { detectLanguage } from "./utils";

export async function collectFilesAsTree(
  baseDir: string,
  files: string[],
  options: {
    tokenEncoder?: string;
    tokenLimit?: number;
  } = {}
): Promise<{ root: FileNode; totalSize: number; totalTokens: number }> {
  const root: FileNode = {
    name: path.basename(baseDir),
    path: "",
    type: "directory",
    children: [],
  };

  let totalSize = 0;
  let totalTokens = 0;

  // Sort files to ensure consistent tree structure
  files.sort();

  for (const filePath of files) {
    const relativePath = path.relative(baseDir, filePath);
    const pathParts = relativePath.split(path.sep);

    // Navigate/create directory structure
    let currentNode = root;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const dirName = pathParts[i];

      if (!currentNode.children) {
        currentNode.children = [];
      }

      let dirNode = currentNode.children.find(
        (child) => child.type === "directory" && child.name === dirName
      );

      if (!dirNode) {
        dirNode = {
          name: dirName,
          path: pathParts.slice(0, i + 1).join("/"),
          type: "directory",
          children: [],
        };
        currentNode.children.push(dirNode);
      }

      currentNode = dirNode;
    }

    // Add file node
    try {
      const fileName = pathParts.at(-1)!;
      const content = await readFile(filePath, "utf8");
      const stats = await stat(filePath);
      const encoder: TokenEncoder =
        (options.tokenEncoder as TokenEncoder) || "simple";
      const tokens = await countTokens(content, encoder);

      const fileNode: FileNode = {
        name: fileName,
        path: relativePath,
        type: "file",
        content,
        language: detectLanguage(fileName),
        size: stats.size,
        tokens,
        lastModified: stats.mtime,
      };

      if (!currentNode.children) {
        currentNode.children = [];
      }

      currentNode.children.push(fileNode);
      totalSize += stats.size;
      totalTokens += tokens;
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
    }
  }

  // Sort children in each directory for consistent output
  sortTreeChildren(root);

  return { root, totalSize, totalTokens };
}

function sortTreeChildren(node: FileNode) {
  if (node.children) {
    // Sort: directories first, then files, alphabetically
    node.children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    // Recursively sort children
    for (const child of node.children) {
      if (child.type === "directory") {
        sortTreeChildren(child);
      }
    }
  }
}
