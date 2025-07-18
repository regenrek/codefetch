/**
 * Tree structure utilities for converting between flat file arrays and tree structures
 */

import type { FileNode } from "./types.js";
import type { FileContent } from "./markdown-content.js";

/**
 * Convert a flat array of files to a tree structure
 */
export function filesToTree(files: FileContent[]): FileNode {
  const root: FileNode = {
    name: "root",
    path: "",
    type: "directory",
    children: [],
  };

  for (const file of files) {
    const parts = file.path.split("/");
    let currentNode = root;

    // Create directory nodes as needed
    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      let childNode = currentNode.children?.find(
        (child) => child.name === dirName && child.type === "directory"
      );

      if (!childNode) {
        childNode = {
          name: dirName,
          path: parts.slice(0, i + 1).join("/"),
          type: "directory",
          children: [],
        };
        if (!currentNode.children) currentNode.children = [];
        currentNode.children.push(childNode);
      }

      currentNode = childNode;
    }

    // Add the file node
    const fileName = parts.at(-1) || "";
    const fileNode: FileNode = {
      name: fileName,
      path: file.path,
      type: "file",
      content: file.content,
      size: file.content.length,
      language: (file as any).language, // Will be added when we update FileContent type
      tokens: (file as any).tokens,
    };

    if (!currentNode.children) currentNode.children = [];
    currentNode.children.push(fileNode);
  }

  return root;
}

/**
 * Convert a tree structure back to a flat array of files
 */
export function treeToFiles(root: FileNode): FileContent[] {
  const files: FileContent[] = [];

  function traverse(node: FileNode) {
    if (node.type === "file" && node.content !== undefined) {
      files.push({
        path: node.path,
        content: node.content,
      });
    } else if (node.type === "directory" && node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(root);
  return files;
}

/**
 * Find a node by its path in the tree
 */
export function findNodeByPath(root: FileNode, path: string): FileNode | null {
  if (path === "" || path === root.path) return root;

  const parts = path.split("/");
  let currentNode = root;

  for (const part of parts) {
    if (!currentNode.children) return null;

    const childNode = currentNode.children.find((child) => child.name === part);
    if (!childNode) return null;

    currentNode = childNode;
  }

  return currentNode;
}

/**
 * Walk the tree and call a callback for each node
 */
export function walkTree(
  root: FileNode,
  callback: (node: FileNode, depth: number) => void,
  depth: number = 0
): void {
  callback(root, depth);

  if (root.children) {
    for (const child of root.children) {
      walkTree(child, callback, depth + 1);
    }
  }
}

/**
 * Calculate total size and token count for a tree
 */
export function calculateTreeMetrics(root: FileNode): {
  totalFiles: number;
  totalSize: number;
  totalTokens: number;
} {
  let totalFiles = 0;
  let totalSize = 0;
  let totalTokens = 0;

  walkTree(root, (node) => {
    if (node.type === "file") {
      totalFiles++;
      totalSize += node.size || 0;
      totalTokens += node.tokens || 0;
    }
  });

  return { totalFiles, totalSize, totalTokens };
}

/**
 * Sort tree nodes (directories first, then files, alphabetically)
 */
export function sortTree(root: FileNode): FileNode {
  const sortedRoot = { ...root };

  if (sortedRoot.children) {
    sortedRoot.children = [...sortedRoot.children].sort((a, b) => {
      // Directories come before files
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      // Then sort alphabetically
      return a.name.localeCompare(b.name);
    });

    // Recursively sort children
    sortedRoot.children = sortedRoot.children.map((child) =>
      child.type === "directory" ? sortTree(child) : child
    );
  }

  return sortedRoot;
}

/**
 * Filter tree based on a predicate function
 */
export function filterTree(
  root: FileNode,
  predicate: (node: FileNode) => boolean
): FileNode | null {
  if (!predicate(root)) return null;

  const filteredRoot = { ...root };

  if (filteredRoot.children) {
    filteredRoot.children = filteredRoot.children
      .map((child) => filterTree(child, predicate))
      .filter((child): child is FileNode => child !== null);

    // Remove empty directories
    if (
      filteredRoot.type === "directory" &&
      filteredRoot.children.length === 0
    ) {
      return null;
    }
  }

  return filteredRoot;
}
